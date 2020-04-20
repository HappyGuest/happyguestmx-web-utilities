class WithDataError extends Error {
    constructor(name, message, data) {
      super(JSON.stringify({
        errorType: name,
        errorMessage: message,
        errorData: data
      }));
      this.name = "ErrorWithData";
      Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = WithDataError;