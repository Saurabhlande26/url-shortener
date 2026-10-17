const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "Click",
    tableName: "clicks",

    columns: {
        id: {
            type: "bigint",
            primary: true,
            generated: "identity",
        },
        eventId: {
            name: "event_id",
            type: "varchar",
            length: 50,
            nullable: true,
        },
        ipAddress: {
            name: "ip_address",
            type: "varchar",
            length: 45,
            nullable: true,
        },

        userAgent: {
            name: "user_agent",
            type: "text",
            nullable: true,
        },

        referer: {
            name: "referer",
            type: "text",
            nullable: true,
        },

        createdAt: {
            name: "created_at",
            type: "timestamptz",
            createDate: true,
        },
    },

    relations: {
        url: {
            type: "many-to-one",
            target: "Url",
            joinColumn: {
                name: "url_id",
            },
            nullable: false,
            onDelete: "CASCADE",
        },
    },
});