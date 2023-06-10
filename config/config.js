require('dotenv').config()

module.exports = {
    "development": {
        "username": process.env.DB_USERNAME,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_DATABASE,
        "host": process.env.DB_HOST,
        "dialect": process.env.DB_DIALECT,
        "port": process.env.DB_PORT,
        "logging": false,
        "dialectOptions": {
            "useUTC": false, // for reading from database
        },
        "timezone": '+07:00',

    },
    "test": {
        "username": process.env.DB_USERNAME,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_DATABASE,
        "host": process.env.DB_HOST,
        "dialect": process.env.DB_DIALECT,
        "port": process.env.DB_PORT,
        "logging": process.env.DB_LOGGING,
        "dialectOptions": {
            "useUTC": false, // for reading from database
        },
        "timezone": '+07:00',

    },
    "production": {
        "username": process.env.DB_USERNAME,
        "password": process.env.DB_PASSWORD,
        "database": process.env.DB_DATABASE,
        "host": process.env.DB_HOST,
        "dialect": process.env.DB_DIALECT,
        "port": process.env.DB_PORT,
        "dialectOptions": {
            "useUTC": false, // for reading from database
        },
        "timezone": '+07:00',

        // "dialectOptions": {
        //     "ssl": true,
        // },
    },
};

