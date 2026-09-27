const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "Url",
    tableName: "urls",

    columns: {
        id: {
            type: "bigint",
            primary: true,
            generated: "identity",
        },

        shortCode: {
            name: "short_code",
            type: "varchar",
            length: 10,
            unique: true,
        },

        originalUrl: {
            name: "original_url",
            type: "text",
        },

        customAlias: {
            name: "custom_alias",
            type: "varchar",
            length: 50,
            unique: true,
            nullable: true,
        },

        clickCount: {
            name: "click_count",
            type: "bigint",
            default: 0,
        },

        expiresAt: {
            name: "expires_at",
            type: "timestamptz",
            nullable: true,
        },

        isActive: {
            name: "is_active",
            type: "boolean",
            default: true,
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

    relations: {
        user: {
            type: "many-to-one",
            target: "User",
            joinColumn: {
                name: "user_id",
            },
            nullable: true,
            onDelete: "CASCADE",
        },
    },
});