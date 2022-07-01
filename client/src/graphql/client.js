import {
  ApolloClient, ApolloLink, HttpLink, InMemoryCache
} from 'apollo-boost';
import { getAccessToken } from '../auth';
import {getMainDefinition} from 'apollo-utilities';
import {WebSocketLink} from "apollo-link-ws";

const httpUrl = 'http://localhost:9000/graphql';
const wsUrl = 'ws://localhost:9000/subscriptions';

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

const wsLink = new WebSocketLink({uri: wsUrl, options: {reconnect: true, lazy: true}});

const isSubscription = ({query}) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
}

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.split(
    isSubscription,
    wsLink,
    httpLink
    ),
  defaultOptions: {query: {fetchPolicy: 'no-cache'}}
});

export default client;
