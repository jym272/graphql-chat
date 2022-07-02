import { gql } from '@apollo/client';
import client from './client';

export const messagesQuery = gql`
  query MessagesQuery {
    messages {
      id
      from
      text
    }
  }
`;

export const messageAddedSubscription = gql`
    subscription MessageAddedSubscription{
        messageAdded{
            id
            from
            text
        }
    }
`;

export const addMessageMutation = gql`
  mutation AddMessageMutation($input: MessageInput!) {
    message: addMessage(input: $input) {
      id
      from
      text
    }
  }
`;

export async function addMessage(text) {
  const {data} = await client.mutate({
    mutation: addMessageMutation,
    variables: {input: {text}}
  });
  return data.message;
}

export async function getMessages() {
  const {data} = await client.query({query: messagesQuery});
  return data.messages;
}

export function onMessageAdded(callback) {
  const observable = client.subscribe({
    query: messageAddedSubscription,
  });
  return observable.subscribe(({data})=>callback(data.messageAdded));
}
