const contactService = require("../services/contacts.service")

async function createContact(req, res, next) {

    const contact = await contactService.createContact(req.body)
    return res.status(201).json(contact)

}


async function getContact(req, res, next) {

    const contact = await contactService.getContact(req.params)
    return res.status(200).json(contact)
}

async function updateContact(req, res, next) {

    const contact = await contactService.updateContact(req.params.id, req.body)
    return res.status(200).json(contact)
}


module.exports = {
  createContact,
  getContact,
  updateContact,
}
