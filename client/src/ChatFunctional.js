import React from 'react';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import useChatMessages from "./Hooks/useChatMessages";


const ChatFunctional = ({user}) => {
    const {messages, loading, error, handleSend} = useChatMessages();

    if (loading) return <div>Loading...</div>
    if (error) return <div>Error</div>

    return <section className="section">
        <div className="container">
            <h1 className="title">Chatting as {user}</h1>
            <MessageList user={user} messages={messages}/>
            <MessageInput onSend={handleSend}/>
        </div>
    </section>

}

const ChatFunctionalComponent = React.memo(ChatFunctional);

export default ChatFunctionalComponent;
