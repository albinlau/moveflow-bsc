import { Address, BigInt, store, log } from "@graphprotocol/graph-ts";

import {
  CreateStream,
  WithdrawFromStream,
  CancelStream,
} from "../../generated/Stream/IStream";
import { StreamList, StreamRecipient, StreamSender, StreamRecipientWithdrawLog, StreamSendeCancelLog, StreamSenderDepositeLog } from "../../generated/schema";

export function handleCreateStream(event: CreateStream): void {
  let stream = StreamList.load(event.params.streamId.toHex());
  if (stream) {
    log.error("[handleCreateSubscription]StreamList already exists {}", [event.params.streamId.toHex()]);
  } else {
    stream = new StreamList(event.params.streamId.toHex());
  }

  stream.deposit = event.params.deposit;
  stream.withdrawnBalance = BigInt.fromI32(0);
  stream.remainingBalance = event.params.deposit;
  stream.isEntity = true;
  stream.ratePerInterval = event.params.ratePerInterval;
  stream.startTime = event.params.startTime;
  stream.stopTime = event.params.stopTime;
  stream.interval = event.params.interval;
  stream.lastWithdrawTime = event.params.startTime;
  stream.tokenAddress = event.params.tokenAddress;

  let recipient = StreamRecipient.load(event.params.recipient.toHex());
  if (!recipient) {
    recipient = new StreamRecipient(event.params.recipient.toHex());
    recipient.withdrawnBalance = BigInt.fromI32(0);
    recipient.remainingBalance = BigInt.fromI32(0);
  }
  recipient.remainingBalance = recipient.remainingBalance.plus(event.params.deposit);
  stream.recipient = recipient.id;
  recipient.save();

  let sender = StreamSender.load(event.params.sender.toHex());
  if (!sender) {
    sender = new StreamSender(event.params.sender.toHex());
    sender.deposit = BigInt.fromI32(0);
    sender.withdrawnToRecipient = BigInt.fromI32(0);
  }
  sender.deposit = sender.deposit.plus(event.params.deposit);
  stream.sender = sender.id;
  
  let logId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let senderDepositeLog = StreamSenderDepositeLog.load(logId);
  if (senderDepositeLog) {
    log.error("[handleDepositeFromSender]SenderDepositeLog already exists {}", [logId]);
  } else {
    senderDepositeLog = new StreamSenderDepositeLog(logId);
  }
  senderDepositeLog.sender = sender.id;
  senderDepositeLog.stream = stream.id;
  senderDepositeLog.depositeAmount = event.params.deposit;
  senderDepositeLog.depositeTime = event.block.timestamp;

  senderDepositeLog.save();
  sender.save();
  stream.save();
}

export function handleWithdrawFromStream(event: WithdrawFromStream): void {
  let stream = StreamList.load(event.params.streamId.toHex());
  if (!stream) {
    log.error("[handleWithdrawFromRecipient]StreamList does not exist {}", [event.params.streamId.toHex()]);
    return;
  }
  stream.remainingBalance = stream.remainingBalance.minus(event.params.amount);
  stream.withdrawnBalance = stream.withdrawnBalance.plus(event.params.amount);
  stream.lastWithdrawTime = event.block.timestamp;

  let recipient = StreamRecipient.load(event.params.recipient.toHex());
  if (!recipient) {
    log.error("[handleWithdrawFromRecipient]Recipient does not exist {}", [event.params.recipient.toHex()]);
    return;
  }
  recipient.withdrawnBalance = recipient.withdrawnBalance.plus(event.params.amount);
  recipient.remainingBalance = recipient.remainingBalance.minus(event.params.amount);

  let sender = StreamSender.load(stream.sender);
  if (!sender) {
    log.error("[handleWithdrawFromRecipient]Sender does not exist {}", [stream.sender]);
    return;
  }
  sender.withdrawnToRecipient = sender.withdrawnToRecipient.plus(event.params.amount);

  let logId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let recipientWithdrawLog = StreamRecipientWithdrawLog.load(logId);
  if (recipientWithdrawLog) {
    log.error("[handleWithdrawFromRecipient]RecipientWithdrawLog already exists {}", [logId]);
  } else {
    recipientWithdrawLog = new StreamRecipientWithdrawLog(logId);
  }
  recipientWithdrawLog.recipient = recipient.id;
  recipientWithdrawLog.stream = stream.id;
  recipientWithdrawLog.withdrawAmount = event.params.amount;
  recipientWithdrawLog.withdrawTime = event.block.timestamp;

  recipient.save();
  sender.save();
  recipientWithdrawLog.save();
  stream.save();
}

export function handleCancelStream(event: CancelStream): void {
  let stream = StreamList.load(event.params.streamId.toHex());
  if (!stream) {
    log.error("[handleCancelStream]StreamList does not exist {}", [event.params.streamId.toHex()]);
    return;
  }
  stream.isEntity = false;
  stream.deposit = stream.deposit.minus(stream.remainingBalance);
  stream.remainingBalance = BigInt.fromI32(0);
  stream.stopTime = event.block.timestamp;

  let sender = StreamSender.load(stream.sender);
  if (!sender) {
    log.error("[handleCancelStream]Sender does not exist {}", [stream.sender]);
    return;
  }
  sender.deposit = sender.deposit.minus(event.params.senderBalance);
  sender.withdrawnToRecipient = sender.withdrawnToRecipient.plus(event.params.recipientBalance);

  let recipient = StreamRecipient.load(stream.recipient);
  if (!recipient) {
    log.error("[handleCancelStream]Recipient does not exist {}", [stream.recipient]);
    return;
  }
  recipient.remainingBalance = recipient.remainingBalance.minus(event.params.senderBalance).minus(event.params.recipientBalance);
  recipient.withdrawnBalance = recipient.withdrawnBalance.plus(event.params.recipientBalance);

  let logId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let senderCancelLog = StreamSendeCancelLog.load(logId);
  if (senderCancelLog) {
    log.error("[handleCancelStream]SenderCancelLog already exists {}", [logId]);
  } else {
    senderCancelLog = new StreamSendeCancelLog(logId);
  }
  senderCancelLog.sender = sender.id;
  senderCancelLog.stream = stream.id;
  senderCancelLog.cancelTime = event.block.timestamp;
  senderCancelLog.senderBalance = event.params.senderBalance;
  senderCancelLog.recipientBalance = event.params.recipientBalance;

  sender.save();
  recipient.save();
  senderCancelLog.save();
  stream.save();
}