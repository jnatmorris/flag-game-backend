import { Server, Socket } from "socket.io";
import { JoinLeave, RequestChange, requestChecker,removeFromRoom } from "./helpers";
import {usersType, gameRequestsType,roomsType} from "./types"

const io = new Server({cors: {
    origin: "http://localhost:3000"
}});

var users: usersType[] = []
var rooms: roomsType = {}
var gameRequests: gameRequestsType = {}
var allSockets: Socket[] = []
  
const removeUser = (playerToRemove:string, myID:string):void => {
    const index = gameRequests[playerToRemove].indexOf(myID);
    gameRequests[playerToRemove].splice(index, 1);       
}

const addUser = (opponentID: string, myID: string): void => {
    console.log("MyID: ", myID)
    console.log("oppenentID: ",opponentID )
    gameRequests[opponentID].push(myID);  
}

// when someone joins
io.on("connection", (socket: Socket) => {
    // add new users array of people who want to play against them
    gameRequests[socket.id] = []
    allSockets.push(socket)
 
    // disconnect the user when they request
    socket.on("requestDisconnect", () => {
        socket.disconnect()
    });
    
    socket.on("sendMyName", (arg)=> {
        users.push({
            id: socket.id,
            name: arg,
        })
       JoinLeave(true, users)
        // emit to all connected clients
        io.emit("allPlayableUsers", users)

    })

    // when request opponent
    socket.on("request-Opponent", ({opponentID,myID}) => {
        addUser(opponentID, myID)
        // send opponent their own array
        socket.to(opponentID).emit("inform-opponent-ofPlayer", gameRequests[opponentID])
        RequestChange(gameRequests)


        requestChecker(opponentID, myID, gameRequests, rooms, allSockets , io)
    })

    // when take back request of opponent
    socket.on("remove-Opponent", ({opponentID,myID}) => {
        removeUser(opponentID, myID)
        // send opponent their own array
        socket.to(opponentID).emit("inform-opponent-ofPlayer", gameRequests[opponentID])
        RequestChange(gameRequests)
    })

    socket.on("both-Opponent", ({ opponentID, whoIwantToPlay, myID }) => {
        // opponentID: socketID want to play against
        // whoIwantToPlay: socketID used to want to play against
        // myID: my socketID

        removeUser(whoIwantToPlay,myID)
        addUser(opponentID,myID)

        // tell old person I don't want to play them
        socket.to(whoIwantToPlay).emit("inform-opponent-ofPlayer", gameRequests[whoIwantToPlay])
        // tell new person I want to play against them 
        socket.to(opponentID).emit("inform-opponent-ofPlayer", gameRequests[opponentID])
        RequestChange(gameRequests)
    })

    // on user disconnecting, remove from users array and emit lasting players
    socket.on("disconnect", () => {
        // console.log(io.sockets.adapter.rooms);

        // need to remove person person with id
        for (var i = users.length - 1; i >= 0; --i) {
            if (users[i].id === socket.id) {
                removeFromRoom(rooms, socket.id)
                users.splice(i, 1);
                

            }
        }

       JoinLeave(false,users)
        // delete person who left && emit to all of new absence 
        delete gameRequests[socket.id]
        io.emit("allPlayableUsers", users)
    });
  
});

// port to listen on
io.listen(4000);