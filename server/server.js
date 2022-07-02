const {ApolloServer} = require("apollo-server-express");
const {createServer} = require("http");
const express = require('express');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const {makeExecutableSchema} = require("@graphql-tools/schema");
const {WebSocketServer} = require("ws");
const {useServer} = require("graphql-ws/lib/use/ws");
const {ApolloServerPluginDrainHttpServer} = require("apollo-server-core");
const resolvers = require('./resolvers');
const fs = require('fs');
const cors = require('cors');

const PORT = 9000;
const jwtSecret = Buffer.from('xkMBdsE+P6242Z2dPV3RD91BPbLIko7t', 'base64');

// Create the schema, which will be used separately by ApolloServer and
// the WebSocket server.
const typeDefs = fs.readFileSync('./schema.graphql', {encoding: 'utf8'});
const schema = makeExecutableSchema({typeDefs, resolvers});

// Create an Express app and HTTP server; we will attach both the WebSocket
// server and the ApolloServer to this HTTP server.
const app = express();
app.use(cors(), express.json(), expressJwt(
    {
        credentialsRequired: false,
        secret: jwtSecret,
        algorithms: ['HS256']
    }));

function context({req, connection}) {
    if (req && req.user) {
        return {userId: req.user.sub};
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

const httpServer = createServer(app);

// Create our WebSocket server using the HTTP server we just set up.
const wsServer = new WebSocketServer({
                                         server: httpServer, path: '/graphql',
                                     });

const getDynamicContext = async (ctx, msg, args) => {
    // ctx is the graphql-ws Context where connectionParams live
    if (ctx?.connectionParams?.accessToken) {
        const accessToken = ctx.connectionParams.accessToken;
        if (accessToken) {
            const {sub} = jwt.verify(accessToken, jwtSecret);
            return {userId: sub};
        }
    }
    // Otherwise let our resolvers know we don't have a current user
    return { };
};

// Save the returned server's info so we can shutdown this server later
const serverCleanup = useServer(
    {
        // Our GraphQL schema.
        schema,
        // Adding a context property lets you add data to your GraphQL operation context
        context: (ctx, msg, args) => {
            // You can define your own function for setting a dynamic context
            // or provide a static value
            return getDynamicContext(ctx, msg, args);
        },
        // As before, ctx is the graphql-ws Context where connectionParams live.
        onConnect: async (ctx) => {
            // Check authentication every time a client connects.
            if (ctx?.connectionParams?.accessToken === undefined) {
                // You can return false to close the connection  or throw an explicit error
                throw new Error('Auth token missing!');
            }
        },
    },
    wsServer,);

// Set up ApolloServer.
const server = new ApolloServer({
                                    schema, csrfPrevention: true, cache: "bounded", context, plugins: [// Proper shutdown for the HTTP server.
        ApolloServerPluginDrainHttpServer({httpServer}),

        // Proper shutdown for the WebSocket server.
        {
            async serverWillStart() {
                return {
                    async drainServer() {
                        await serverCleanup.dispose();
                    },
                };
            },
        },],
                                });

const severStart = async () => {
    await server.start();
}
severStart().then(() => {
    server.applyMiddleware({app});

// Now that our HTTP server is fully set up, we can listen to it.
    httpServer.listen(PORT, () => {
        console.log(`Server is now running on http://localhost:${PORT}${server.graphqlPath}`,);
    });
});
