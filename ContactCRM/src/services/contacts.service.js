const { randomUUID } = require("crypto")
const contactRepository = require("../repositories/contacts.repository")
const AppError = require("../errors/AppError")

async function createContact(data) {
    const existing = contactRepository.findByEmail(data.email)

    if(existing) {
        throw new AppError(
            "EMAIL_ALREADY_EXISTS",
            "A contact with this email already exists",
            409
        )
    }

    const contact = {
        id: randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
    }

    contactRepository.save(contact);

    return contact;
}


async function getContact(data) {
    const contact = contactRepository.findById(data.id)

    if(!contact) {
        throw new AppError(
            "NOT_FOUND",
            "Contact doesn't exists",
            404
        )
    }

    return contact
}

async function updateContact(id, data) {
    const contact = contactRepository.findById(id)

    if(!contact) {
        throw new AppError(
            "NOT_FOUND",
            "Contact doesn't exists",
            404
        )
    }

    if(data.email) {
        const existing = contactRepository.findByEmail(data.email)

        if(existing && existing.id !== id) {
            throw new AppError(
                "EMAIL_ALREADY_EXISTS",
                "A contact with this email already exists",
                409
            )
        }
    }

    return contactRepository.update(id, data)
}


module.exports = {
  createContact,
  getContact,
  updateContact,
};
