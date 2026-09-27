const {
    EntitySchema
} = require("typeorm");

module.exports = new EntitySchema({
    name: "User",

    tableName: "users",

    columns: {
        id: {
            type: "bigint",
            primary: true,
            generated: "identity",
        },

        email: {
            type: "varchar",
            length: 255,
            unique: true,
        },

        passwordHash: {
            name: "password_hash",
            type: "varchar",
            length: 255,
        },

        createdAt: {
            name: "created_at",
            type: "timestamptz",
            createDate: true,
        },

        updatedAt: {
            name: "updated_at",
            type: "timestamptz",
            updateDate: true,
        },
    },
});