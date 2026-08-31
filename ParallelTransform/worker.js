const crypto = require("crypto");
const { parentPort } = require("worker_threads");

function transformRecord(record) {
  const normalizedEmail = record.email
    ? String(record.email).trim().toLowerCase()
    : null;

  const normalizedPhone = record.phone
    ? String(record.phone).replace(/\D/g, "")
    : null;

  const dedupSource = [
    normalizedEmail,
    normalizedPhone,
    record.firstName,
    record.lastName,
  ]
    .filter(Boolean)
    .join("|");

  const dedupKey = slowHash(dedupSource);

  return {
    ...record,
    normalizedEmail,
    normalizedPhone,
    dedupKey,
  };
}

function slowHash(value) {
  let hash = String(value);

  for (let i = 0; i < 5000; i++) {
    hash = crypto.createHash("sha256").update(hash).digest("hex");
  }

  return hash;
}

parentPort.on("message", (task) => {
  try {
    const transformedRecords = task.records.map(transformRecord);

    parentPort.postMessage({
      taskId: task.taskId,
      chunkIndex: task.chunkIndex,
      records: transformedRecords,
    });
  } catch (error) {
    parentPort.postMessage({
      taskId: task.taskId,
      chunkIndex: task.chunkIndex,
      error: error.message,
    });
  }
});