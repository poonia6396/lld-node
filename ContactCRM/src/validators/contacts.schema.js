const { z } = require("zod")

const createContactSchema = z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.string().email(),
    company: z.string().optional(),
})

const getContactSchema = z.object({
    id: z.uuid(),
})

const updateContactSchema = z.object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    company: z.string().trim().min(1).optional(),
}).refine((data) => Object.keys(data).length >= 1,
    {
        message: "At least one field should be provided",
    })

module.exports = {
    createContactSchema,
    getContactSchema,
    updateContactSchema,
}
