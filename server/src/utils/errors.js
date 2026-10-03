export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function errorHandler(error, req, res, _next) {
  const status =
    error.status ||
    (error.name === 'ZodError' ? 400 : error.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500)
    console.error(
      JSON.stringify({
        requestId: req.id,
        name: error.name,
        code: error.code,
        message: error.message,
      }),
    );
  res
    .status(status)
    .json({
      error: {
        message:
          status >= 500
            ? 'Something went wrong. Please try again.'
            : error.name === 'ZodError'
              ? 'Please check the submitted fields.'
              : error.message,
        requestId: req.id,
      },
    });
}
