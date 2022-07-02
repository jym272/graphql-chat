import {useMutation, useQuery} from "@apollo/client";
import {addMessageMutation, messageAddedSubscription, messagesQuery} from "../graphql/queries";
import {useCallback, useEffect, useMemo} from "react";

const useChatMessages =() => {
    const {subscribeToMore, loading, error:errorMessageQuery, data} = useQuery(messagesQuery);
    const [addMessage, {loading: addMessageLoading, error: addMessageError}] = useMutation(addMessageMutation);

    const messages = useMemo(()=>data?.messages || [], [data]);

    // 1era forma
    // useSubscription(messageAddedSubscription,
    //     {
    //         onSubscriptionData: ({client, subscriptionData}) => {
    //             client.cache.modify({
    //                 fields: {
    //                     messages: (messages) => {
    //                         if (messages) {
    //                             return messages.concat(subscriptionData.data.messageAdded)
    //                         }
    //                     }
    //
    //                 }
    //
    //             })
    //         }
    //
    // });

    // 2da forma
    useEffect(() => {
        // updateQuery is a function that tells Apollo Client how to combine the query's currently cached result (prev) with
        // the subscriptionData that's pushed by our GraphQL server. The return value of this function completely replaces
        // the current cached result for the query.
        const subscribeToNewComments = () => {
            subscribeToMore({
                document: messageAddedSubscription,
                updateQuery: (prev, {subscriptionData}) => {
                    if (!subscriptionData.data) {
                        return prev;
                    }
                    const newMessage = subscriptionData.data.messageAdded;
                    return {
                        ...prev,
                        messages: [...prev.messages, newMessage]
                    };
                }
            });
        }
        subscribeToNewComments();
    }, []);

    const handleSend = useCallback( async (text) => {
        await addMessage({variables: {input: {text}}});
    }, [addMessage]);

    return {messages, loading, error:  errorMessageQuery || addMessageError, handleSend};
}

export default useChatMessages;