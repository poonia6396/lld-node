function validate(schema, property) {
    return (req, res, next) => {
        try {
            req[property] = schema.parse(req[property]);
            next();
        } catch (err) {
            next(err);
        }
    };
}

module.exports = validate
