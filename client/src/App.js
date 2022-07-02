import React, {Component} from 'react';
import {getLoggedInUser, logout} from './auth';
import Login from './Login';
import NavBar from './NavBar';
import {ApolloProvider} from '@apollo/client';
import client from "./graphql/client";
import ChatFunctionalComponent from "./ChatFunctional";

class App extends Component {
    state = {user: getLoggedInUser()};

    handleLogin(user) {
        this.setState({user});
    }

    handleLogout() {
        logout();
        this.setState({user: null});
    }

    render() {
        const {user} = this.state;
        if (!user) {
            return <Login onLogin={this.handleLogin.bind(this)}/>;
        }
        return (
            <ApolloProvider client={client}>
                <div>
                    <NavBar onLogout={this.handleLogout.bind(this)}/>
                    <ChatFunctionalComponent user={user}/>
                </div>
            </ApolloProvider>
        );
    }
}

export default App;
