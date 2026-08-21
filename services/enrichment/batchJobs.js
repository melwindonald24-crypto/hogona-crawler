
export async function claimPendingJobs(enrichmentJob, batchId, limit) {
  return enrichmentJob.sequelize.transaction(async (transaction) => {
    const jobs = await enrichmentJob.findAll({
      where: { status: "pending" },
      order: [["created_at", "ASC"]],
      limit,
      lock: transaction.LOCK.UPDATE,
      skipLocked: true,
      transaction,
    });

    if (jobs.length === 0) return [];

    await enrichmentJob.update(
      { status: "exported", batch_id: batchId },
      {
        where: { id: jobs.map((job) => job.id), status: "pending" },
        transaction,
      },
    );
    return jobs;
  });
}

export async function releaseBatch(enrichmentJob, batchId) {
  await enrichmentJob.update(
    { status: "pending", batch_id: null },
    { where: { batch_id: batchId, status: "exported" } },
  );
}


export async function importCompletedBatch(enrichmentJob, batch) {

  return enrichmentJob.sequelize.transaction(async (transaction) => {
    const jobs = await enrichmentJob.findAll({
      where: { batch_id: batch.batch_id, status: "exported" },
      transaction,
    });
    const exportedIds = new Set(jobs.map((job) => job.id));
    const resultIds = new Set(batch.places.map((place) => place.job_id));
    if (
      exportedIds.size !== resultIds.size ||
      [...resultIds].some((id) => !exportedIds.has(id))
    )
      throw new Error("Result jobs do not exactly match the exported batch.");
      
    await Promise.all(
      batch.places.map((result) =>
        enrichmentJob.update(
          {
            output_data: {
              ...result,
              batch_id: batch.batch_id,
              confidence: "needs_review",
            },
            status: "completed",
          },
          {
            where: {
              id: result.job_id,
              batch_id: batch.batch_id,
              status: "exported",
            },
            transaction,
          },
        ),
      ),
    );
    return batch.places.length;
  });
}
