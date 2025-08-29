const { Writable } = require('stream');
module.exports = {
  v2: {
    config: jest.fn(),
    // Simula geração de URL (assinada) do Cloudinary
    url: (publicIdWithExt, opts = {}) => {
      const cloud = process.env.CLOUDINARY_CLOUD_NAME || 'demo';
      const resource = opts.resource_type || 'raw';
      const type = opts.type || 'upload';
      const base = `https://res.cloudinary.com/${cloud}/${resource}/${type}/v123456/${publicIdWithExt}`;
      // se secure e sign_url, apenas retorna a mesma URL simulada
      return base;
    },
    uploader: {
      upload_stream: (opts, cb) => {
        const stream = new Writable({ write(_c, _e, done) { done(); } });
        if (cb) cb(null, { secure_url: 'http://example.com/mock.pdf' });
        return stream;
      }
    }
  }
};
