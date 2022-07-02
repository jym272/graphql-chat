import {
  ApolloClient, ApolloLink, HttpLink, InMemoryCache, split
} from '@apollo/client';
import { getAccessToken } from '../auth';
import {getMainDefinition} from '@apollo/client/utilities';
import {GraphQLWsLink} from "@apollo/client/link/subscriptions";
import {createClient} from "graphql-ws";

const httpUrl = 'http://localhost:9000/graphql';
const wsUrl = 'ws://localhost:9000/graphql';

const httpLink = ApolloLink.from([
  new ApolloLink((operation, forward) => {
    const token = getAccessToken();
    if (token) {
      operation.setContext({headers: {'authorization': `Bearer ${token}`}});
    }
    return forward(operation);
  }),
  new HttpLink({uri: httpUrl})
]);

const wsLink = new GraphQLWsLink(createClient({
    url: wsUrl,
    reconnect: true,
    lazy: true,
    connectionParams: () => {
        const token = getAccessToken();
        return token ? {accessToken: `${token}`} : {};
    }
}));

const splitLink = split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return (
            definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription'
        );
    },
    wsLink,
    httpLink,
);


const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: splitLink,
  defaultOptions: {query: {fetchPolicy: 'no-cache'}}
});

export default client;
