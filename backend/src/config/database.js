const { DataSource } = require("typeorm");

const User = require("../entities/User");
const Url = require("../entities/Url");
const Click = require("../entities/Click");

const AppDataSource = new DataSource({
    type: "postgres",

    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
        User,
        Url,
        Click,
    ],
    migrations: ["src/migrations/*.js"],
    synchronize: false,

    logging: false,
});

module.exports = AppDataSource;