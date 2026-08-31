const express = require("express")
const contactRouter = require("./routes/contacts.routes")
const errorHandler = require("./middlewares/errorHandler")

const app = express()

app.use(express.json())

app.use(contactRouter)

app.use((req,res) => {
    res.status(404).json({
        error: {
            code: "NOT_FOUND",
            message: "Route Not Found",
        }
    })
})

app.use(errorHandler)

module.exports = app