module.exports = {
  async up(db) {
    await db.collection('essays').updateMany(
      { richAnnotations: { $exists: false } },
      { $set: { richAnnotations: [] } }
    );
    // Índice simples por status e submittedAt já existem; se necessário, poderíamos indexar richAnnotations.page.
  },
  async down(db) {
    await db.collection('essays').updateMany(
      {},
      { $unset: { richAnnotations: '' } }
    );
  }
};
