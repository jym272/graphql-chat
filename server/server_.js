const fs = require('fs');
const {ApolloServer} = require('apollo-server-express');
const cors = require('cors');
const express = require('express');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const port = 9000;
const jwtSecret = Buffer.from('xkMBdsE+P6242Z2dPV3RD91BPbLIko7t', 'base64');

const app = express();
app.use(cors(), express.json(), expressJwt({
                                               credentialsRequired: false,
                                               secret: jwtSecret,
                                               algorithms: ['HS256']
                                           }));

const typeDefs = fs.readFileSync('./schema.graphql', {encoding: 'utf8'});
const resolvers = require('./resolvers');
const http = require("http");
const {makeExecutableSchema} = require("@graphql-tools/schema");
const {WebSocketServer} = require("ws");
const {useServer} = require("graphql-ws/lib/use/ws");

function context({req, connection}) {
    if (req && req.user) {
        return {userId: req.user.sub};
    }
    if (connection?.context?.accessToken) {
        const accessToken = connection.context.accessToken;
        if (accessToken) {
            const {sub} = jwt.verify(accessToken, jwtSecret);
            return {userId: sub};
        }
    }
    return {};
}

app.post('/login', (req, res) => {
    const {name, password} = req.body;
    const user = db.users.get(name);
    if (!(user && user.password === password)) {
        res.sendStatus(401);
        return;
    }
    const token = jwt.sign({sub: user.id}, jwtSecret);
    res.send({token});
});

const httpServer = http.createServer(app);

const schema = makeExecutableSchema({typeDefs, resolvers});
const server = new ApolloServer(
    {
        schema,
        csrfPrevention: true,
        cache: "bounded",
        context
    });

// Creating the WebSocket server
const wsServer = new WebSocketServer(
    {
        // This is the `httpServer` we created in a previous step.
        server: httpServer,
        // Pass a different path here if your ApolloServer serves at
        // a different path.
        path: '/graphql',
    });

// Hand in the schema we just created and have the
// WebSocketServer start listening.
const serverCleanup = useServer({schema}, wsServer);

// const apolloServer = new ApolloServer({typeDefs, resolvers, context});
// apolloServer.applyMiddleware({app, path: '/graphql'});


apolloServer.installSubscriptionHandlers(httpServer);

httpServer.listen(port, () => console.log(`Server started on port ${port}`));


