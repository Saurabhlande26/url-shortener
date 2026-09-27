const { DataSource } = require("typeorm");
require("dotenv").config();

const AppDataSource = new DataSource({
    type: "postgres",

    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),

    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    synchronize: true,

    logging: false,

    entities: [
        require("../entities/User"),
        require("../entities/Url"),
    ],
});

module.exports = AppDataSource;