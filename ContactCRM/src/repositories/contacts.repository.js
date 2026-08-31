const contacts = new Map()

function findByEmail(email) {
    for(const contact of contacts.values()) {
        if (contact.email.toLowerCase() === email.toLowerCase()) {
            return contact
        }
    }

    return null
}

function findById(id) {
    return contacts.get(id) ?? null;
}

function save(contact) {
    contacts.set(contact.id, contact);
    return contact;
}

function update(id, data) {
    const contact = contacts.get(id)

    if(!contact) {
        return null
    }

    const updatedContact = {
        ...contact,
        ...data,
    }

    contacts.set(id, updatedContact)
    return updatedContact
}

module.exports = {
    findByEmail,
    findById,
    save,
    update,
}
