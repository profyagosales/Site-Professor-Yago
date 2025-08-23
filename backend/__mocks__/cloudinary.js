const { Writable } = require('stream');
module.exports = {
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: (opts, cb) => {
        const stream = new Writable({ write(_c, _e, done) { done(); } });
        if (cb) cb(null, { secure_url: 'http://example.com/mock.pdf' });
        return stream;
      }
    }
  }
};
