const app = require("./app");

const config = {
    name: 'cbs-simulator',
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
};

app.listen(config.port, config.host, () => {
    console.log(`Running at port - ${config.port}`)
})
