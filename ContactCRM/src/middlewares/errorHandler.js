const { ZodError } = require("zod")

function errorHandler(err, req, res, next) {
    if(err instanceof ZodError) {
        return res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid request",
                details: err.flatten(),
            },
        })
    }

    if(err.statusCode) {
        return res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
            },
        })
    }

    console.error(err);

    return res.status(500).json({
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong.",
        },
    })

}

module.exports = errorHandler