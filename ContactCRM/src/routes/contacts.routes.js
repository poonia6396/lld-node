const express = require("express")
const { createContactSchema, getContactSchema, updateContactSchema } = require("../validators/contacts.schema")
const { createContact, getContact, updateContact } = require("../controllers/contacts.controller")
const validate = require("../middlewares/validate")

const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
}


const router = express.Router()

router.post("/contacts", 
    validate(createContactSchema, "body"),
    asyncHandler(createContact))

router.get("/contacts/:id",
    validate(getContactSchema, "params"),
    asyncHandler(getContact))

router.patch("/contacts/:id",
    validate(getContactSchema, "params"),
    validate(updateContactSchema, "body"),
    asyncHandler(updateContact))

module.exports = router
