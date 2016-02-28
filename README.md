# AnonChat — The anonymous way to discuss trending topics 

This project is just a simple example of AngularJS, SocketIO, MongoDB, TwitterAPI in action. The structure is really messy, but it is more of a proof of concept, and a fun little project to do. If you would like to try it out, a demo link is provided below.

## How does it work?

AnonChat uses trending topics on Twitter to allow users to discuss, furthermore users are able to dicuss their own topics provided they enter the name in the text-field. Every user is assigned an ID to identify them on the website, users may only delete the comments they post, if you open a new browser or clear cookies, you will be assigned a new ID. This app also uses sockets to build a 'chat-like' system, where messages are posted instantly instead of polled. Also it is mobile compatible, which is why it is so simplistic in design.

## Getting Started

Just run 'node install' and then 'node server.js' to run.

Make sure to also create a Twitter Application and save the information in 'server.js', otherwise none of the functions may work.

### Prerequisites

- MongoDB
- NodeJS

### NOTE:
Make sure to unblock uBlock origin as it blocks an important website that is used to retrieve users IP's (Since NodeJS and Angular do not provide reliable ways to retrieve IP's)


## Demo

[Demo]: http://www.pvp.kz:3000
