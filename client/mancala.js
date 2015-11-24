
var MAX_SPEED = 6;
var FRICTION = 0.03;
var EXTRA_FRICTION = 0.03;
var EXTRA_FRICTION_RADIUS = 100;
var GRAVITY = 0.15;
var BEAN_RADIUS = 2;

var canvas = document.getElementById("mancala");
canvas.onselectstart = function () { return false; }
var ctx = canvas.getContext("2d");
var h = canvas.getAttribute("height");
var w = canvas.getAttribute("width");
var colours = {'1': 'rgba(255, 0, 0, [a])', '-1': 'rgba(0, 255, 0, [a])'};

var Player = {
    name: 'Anonymous',
    player: 1, // 1 for the first player, -1 for the second
    ID: 0,
    local: false,
    taketurn: function(board, potclicked){
        //console.log("taking turn")
        if (this.local && potclicked!=-1){
            console.log("sending play");
            window.sendMove(this.ID, potclicked);
        }
        board.play(this.player, potclicked);
    }
};

var AI = Object.create(Player);
AI.level = 1 // Easy: 1, Med: 3, Hard: 6, Impossible: 10
AI.player = -1;
AI.taketurn = function(board, potclicked){
    //console.log("AI player "+this.player+" turn, level "+this.level);
    var gstate = [];
    for (var p in board.pots){
        pot = board.pots[p];
        gstate.push(pot.beans.length);
    }
    var pot = negamax(gstate,this.level,-100,100,this.player).pot;
    //console.log(pot);
    board.play(this.player, pot);
}

function negamax(gstate,depth, a, b, plyr){
    //console.log('negamax, depth: '+depth+', a: '+a+', b: '+b+', plyr: '+plyr);
		if (depth == 0 || gstate[0]+gstate[1]+gstate[2]+gstate[3]+gstate[4]+gstate[5]==0 || gstate[7]+gstate[8]+gstate[9]+gstate[10]+gstate[11]+gstate[12]==0)
		{
			//System.out.println("heuristic: "+plyr*(gstate[7]+gstate[8]+gstate[9]+gstate[10]+gstate[11]+gstate[12]+2*gstate[13]-(gstate[0]+gstate[1]+gstate[2]+gstate[3]+gstate[4]+gstate[5]+2*gstate[6])));
			return {val: -plyr*(gstate[7]+gstate[8]+gstate[9]+gstate[10]+gstate[11]+gstate[12]+2*gstate[13]-(gstate[0]+gstate[1]+gstate[2]+gstate[3]+gstate[4]+gstate[5]+2*gstate[6]))};
		} else {
			var start = 0;
			if (plyr==-1){start=7;}
			var pot = -1;
			var bestValue = -100;
			for (var i=start;i<start+6;i++){
				if (gstate[i]==0) {continue;}
				//if (depth==5){console.log("try "+i+" on "+gstate);}
				var childGstate = gstate.slice();
				var num = childGstate[i];
				childGstate[i]=0;
				var j = i;
				var extraTurn = false;
				while(num!=0){
					j++;
					if ((plyr==1 && j==13) || (plyr==-1 && j==6)){
						j++;
					}
					if (j>13){j-=14;}
					childGstate[j]++;
					num--;
					if (num==0){
						if ((plyr==1 && j==6) || (plyr==-1 && j==13)){//extra turn
							extraTurn = true;
						} else if (childGstate[j]==1 && ((plyr==1 && j < 6) || (plyr==-1 && j > 6 && j < 13))){//capture
							childGstate[j]=0;
							if (plyr==1){
							    childGstate[6]+=1+childGstate[12-j];
							} else {
							    childGstate[13]+=1+childGstate[12-j];
							}
							
							//System.out.println("AI capture sent to "+(int)(9.5+3.5*plyr));
							childGstate[12-j]=0;
						}
					}
				}
				var val = 0;
				if (extraTurn){
					val = parseInt(negamax(childGstate,depth,a,b,plyr).val);
				} else {
					val = -parseInt(negamax(childGstate,depth-1,-b,-a,-plyr).val);
				}
				if (val>bestValue){
				    bestValue = val;
				    pot = i;
				}
				//if (depth==5){console.log('val: '+val+', best: '+bestValue);}
				a = Math.max(a, val);
				//if (depth==5){console.log('a: '+a+', b: '+b);}
				if (a>b){
				    return {val: bestValue, pot: i};
				}
			}
			return {val: bestValue, pot: pot};
		}
	}

var Bean = {
    pos: {x: 0, y: 0},
    prevpos: {x: 0, y: 0},
    renderprevpos: {x: 0, y: 0},
    // bouncepos: {x: -1, y: -1},
    // bounced: false,
    intransit: false,
    free: true,
    colour: 'rgba(255, 255, 255, [a])',
    draw: function(ctx){
        ctx.strokeStyle = this.colour.replace('[a]','1');
        ctx.lineWidth = BEAN_RADIUS;
        ctx.beginPath();
        ctx.moveTo(this.pos.x,this.pos.y);
        // if (this.bounced){
        //     ctx.lineTo(this.bouncepos.x, this.bouncepos.y);
        //     this.bounced = false;
        // }
        ctx.lineTo(this.renderprevpos.x,this.renderprevpos.y);
        ctx.stroke();
    },
    update: function(pot){
        var prevx = this.pos.x;
        var prevy = this.pos.y;
        this.renderprevpos = {x: this.pos.x, y: this.pos.y};
        this.pos.x = 2*this.pos.x - this.prevpos.x;
        this.pos.y = 2*this.pos.y - this.prevpos.y;
        if (this.pos.x>=w || this.pos.x<0){
            this.pos.x = 2*prevx - this.pos.x;
        }
        if (this.pos.y>=h || this.pos.y<0){
            this.pos.y = 2*prevy - this.pos.y;
        }
        this.prevpos.x = prevx;
        this.prevpos.y = prevy;
        
        var dist = distance(this.pos, pot.pos);
				
		if (!this.intransit)
		{
			if (!this.free && dist>pot.radius-BEAN_RADIUS)
			{
				var unx = (this.pos.x-pot.pos.x)/dist;//unit norm
			   	var uny = (this.pos.y-pot.pos.y)/dist;
			   	var utx = -uny;//unit tangent
			   	var uty = unx;
			   	var vn = unx*this.getVX()+uny*this.getVY();//normal component
			   	var vt = utx*this.getVX()+uty*this.getVY();//tangent component
			   	vn = -vn; //bounce
			   	this.prevpos.x = this.pos.x - (vn*unx + vt*utx);
				this.prevpos.y = this.pos.y - (vn * uny + vt * uty);
			}
		} else {
			this.prevpos.x+=this.getVX()*FRICTION;
			this.prevpos.y+=this.getVY()*FRICTION;
			if (dist < pot.radius - BEAN_RADIUS+EXTRA_FRICTION_RADIUS){
				this.prevpos.x+=this.getVX()*EXTRA_FRICTION;
				this.prevpos.y+=this.getVY()*EXTRA_FRICTION;
			}
			this.pos.x+=GRAVITY*(pot.pos.x-this.pos.x)/dist;
			this.pos.y+=GRAVITY*(pot.pos.y-this.pos.y)/dist;
			if (dist < pot.radius - BEAN_RADIUS - 1) {
				this.intransit = false;
			}
		}
    },
    sendToPot: function(){
        this.intransit = true;
        this.free = false;
        var target = {x: w/2.0, y: h/2.0};
        var dist = distance(this.pos, target);
        this.prevpos.x = this.pos.x - (MAX_SPEED * (target.x - this.pos.x) / dist);
		this.prevpos.y = this.pos.y - (MAX_SPEED * (target.y - this.pos.y) / dist);
    },
    getVX: function(){
        return this.pos.x - this.prevpos.x;
    },
    getVY: function(){
        return this.pos.y - this.prevpos.y;
    }
};

var Pot = {
    pos: {x: 0, y: 0},
    radius: 20,
    player: 1,
    beans: [],
    draw: function(ctx){
        ctx.strokeStyle = colours[this.player].replace('[a]','0.1');
        ctx.fillStyle = colours[this.player].replace('[a]','0.2');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.pos.x,this.pos.y,this.radius,0,2*Math.PI);
        ctx.stroke();
        ctx.font = "60px Arial"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(this.beans.length,this.pos.x,this.pos.y);
    }
};

var Board = {
    pots: [],
    players: {},
    currplayer: 1,
    started: false,
    gaveover: false,
    winner: 0,
    ready: false,
    capturefrom: -1,
    captureto: -1,
    play: function(player, potnum){
        if ((!this.players[player].local || this.ready) && this.currplayer == player && ((player == 1 && potnum>=0 && potnum<6) || (player == -1 && potnum>=7 && potnum<13))){
            var beans = this.pots[potnum].beans;
            if (beans.length == 0) {return -1;} // invalid
            var index = potnum;
            //console.log("sending from pot " + potnum)
            for (var b in beans){
                //console.log(index);
                index += 1;
                //console.log(index);
                if ((player==1 && index == 13) || (player==-1 && index == 6)){
                    index+=1;
                }
                //console.log(index);
                if (index>13){
                    index-=14;
                }
                //console.log("sending to pot " + index);
                var newpot = this.pots[index];
                newpot.beans.push(beans[b]);
                beans[b].sendToPot();
            }
            this.pots[potnum].beans = [];
            this.ready = false;
            
            if (index==6 || index==13){
                console.log("another turn for player "+this.currplayer);
                return 1;
            } else {
                if (this.pots[index].beans.length == 1 && (this.currplayer==1 && index<6 || this.currplayer==-1 && index>6)){
                    this.capturefrom = index;
                    this.captureto = 6;
                    if (this.currplayer == -1){
                        this.captureto = 13;
                    }
                }
                
                this.currplayer = this.currplayer*-1;
                console.log('player '+this.currplayer+' turn');
                return 0;
            }
        } else {
            return -1; // invalid, try again
        }
    },
    click: function(pos){
        //console.log(pos);
        for (var p in this.pots) {
            var pot = this.pots[p];
            //console.log(p+': '+pos.x+', '+pot.pos.x);
			if (this.currplayer == pot.player && distance(pos,pot.pos) < pot.radius && this.players[this.currplayer].local) {
			    //console.log(p);
				this.players[pot.player].taketurn(this, +p);
			}
		}
    }
};

function newbeans(n){
    var a = []
    for (var i = 0; i < n; i++) {
        var bean = Object.create(Bean);
        var r = 0, g = 0, b = 0;
        while (r+g+b < 500) {
            r = Math.floor(Math.random()*255);
            g = Math.floor(Math.random()*255);
            b = Math.floor(Math.random()*255);
        }
        bean.colour = 'rgba('+r+', '+g+', '+b+', [a])';
        bean.pos = {x: Math.random()*w, y: Math.random()*h};
        bean.prevpos = {x: bean.pos.x + (Math.random() - 0.5)*MAX_SPEED, y: bean.pos.y + (Math.random() - 0.5)*MAX_SPEED};
        a.push(bean);
    }
    return a;
}

var potXPos = [ 190, 255, 350, 450, 545, 610, 680, 610, 545, 450, 350, 255, 190, 120 ];
var potYPos = [ 420, 490, 520, 520, 490, 420, 300, 180, 110,  80,  80, 110, 180, 300 ];
var potRad =  [  45,  45,  45,  45,  45,  45,  90,  45,  45,  45,  45,  45,  45,  90 ];

var board = Object(Board);
for (var i = 0; i < 14; i++) {
    var pot = Object.create(Pot);
    pot.pos = {x: potXPos[i], y: potYPos[i]};
    pot.radius = potRad[i];
    if ((i+1)%7!=0){
        pot.beans = newbeans(4);
    } else {
        pot.beans = [];
    }
    if (i>6){
        pot.player = -1;
    }
    board.pots.push(pot);
}
var redplayer = Object.create(Player);
var greenplayer = Object.create(Player);
redplayer.player = 1;
greenplayer.player = -1;
redplayer.name = 'Red';
greenplayer.name = 'Green';
board.players = {'1': redplayer, '-1': greenplayer};

function updateGame(){
    var beansready = true;
    for (var p in board.pots) {
        var pot = board.pots[p];
        for (var b in pot.beans) {
            var bean = pot.beans[b];
            bean.update(pot);
            beansready = beansready && !bean.intransit;
        }
    }
    //console.log(board.ready);
    if (beansready && !board.ready){
        //console.log(board.capturefrom)
        //check for game over
        var p1beans = [];
        var p2beans = [];
        board.pots.slice(0,6).forEach(function(p){
            p1beans = p1beans.concat(p.beans);
        });
        board.pots.slice(7,13).forEach(function(p){
            p2beans = p2beans.concat(p.beans);
        });
        if (p1beans.length==0 || p2beans.length==0){
            //console.log(p1beans);
            //console.log(p2beans);
            board.pots.slice(0,6).forEach(function(p){
                p.beans = [];
            });
            board.pots.slice(7,13).forEach(function(p){
                p.beans = [];
            });
            for (var i=p1beans.length-1; i>=0; i--){
                p1beans[i].sendToPot();
                board.pots[6].beans.push(p1beans.pop());
            }
            for (var i=p2beans.length-1; i>=0; i--){
                p2beans[i].sendToPot();
                board.pots[13].beans.push(p2beans.pop());
            }
            board.gameover = true;
            if (board.pots[6].beans.length>board.pots[13].beans.length){
                board.winner = 1;
            } else if (board.pots[6].beans.length<board.pots[13].beans.length) {
                board.winner = -1;
            } else {
                board.winner = 0;
            }
        }
        
        if (board.capturefrom>-1){
            for (var i=board.pots[12-board.capturefrom].beans.length-1; i>=0; i--){
                board.pots[12-board.capturefrom].beans[i].sendToPot();
                board.pots[board.captureto].beans.push(board.pots[12-board.capturefrom].beans.pop());
            }
            board.pots[board.capturefrom].beans[0].sendToPot();
            board.pots[board.captureto].beans.push(board.pots[board.capturefrom].beans.pop());
            board.capturefrom = -1;
        } else {
            board.ready = true;
            //trigger AI
            if (!board.gameover){
                board.players[board.currplayer].taketurn(board,-1);
            }
        }
    }
}

function drawGame(){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, w, h);
    
    for (var p in board.pots) {
        var pot = board.pots[p];
        pot.draw(ctx);
    }
    
    for (var p in board.pots) {
        var pot = board.pots[p];
        for (var b in pot.beans) {
            var bean = pot.beans[b];
            bean.draw(ctx);
        }
    }
    
    if (board.gameover){
        var s = '';
        if (board.winner==0){
            s = 'Tie';
            ctx.fillStyle = 'rbga(0,0,255,0.3)';
        } else {
            s = board.players[board.winner].name + ' Wins!';
            ctx.fillStyle = colours[board.winner].replace('[a]','0.3');
            
        }
        ctx.font = "70px Arial";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.fillText(s,w/2,h/2+board.winner*100);
        ctx.strokeText(s,w/2,h/2+board.winner*100);
    }
    for (var p in board.players) {
        ctx.fillStyle = colours[p].replace('[a]','0.3');
        ctx.font = "20px Arial";
        var s = '';
        if (p==board.currplayer){s='*';}
        ctx.fillText(s+board.players[p].name+s,w/2,h/2+parseInt(p)*(h/2 - 15));
    }
}

function createGame(firstPlayerName, firstPlayerID, secondPlayerName, secondPlayerID, localPlayer, starter){
    firstPlayerName = firstPlayerName!='' ? firstPlayerName : 'Red';
    secondPlayerName = secondPlayerName!='' ? secondPlayerName : 'Green';
    board.players['1'] = setUpPlayer(firstPlayerName, firstPlayerID);
    board.players['-1'] = setUpPlayer(secondPlayerName, secondPlayerID);
    board.players['1'].player = 1;
    board.players['-1'].player = -1;
    board.players[localPlayer].local = true;
    
    board.currplayer = starter;
    
    //redistribute beans
    var allbeans = []
    for (var p in board.pots) {
        var pot = board.pots[p];
        for (var i=pot.beans.length-1; i>=0; i--) {
            allbeans.push(pot.beans.pop());
        }
    }
    for (var p in board.pots) {
        if (p!=6 && p!=13){
            var pot = board.pots[p];
            for (var i = 0; i < 4; i++) {
                pot.beans.push(allbeans.pop());
                //console.log(allbeans.length);
            }
        }
    }
    
    //send all beans to their pots
    for (var p in board.pots) {
        var pot = board.pots[p];
        for (var b in pot.beans) {
            var bean = pot.beans[b];
            bean.sendToPot();
        }
    }
    board.ready = false;
    board.started = true;
    board.gameover = false;
}

function setUpPlayer(name, ID){
    if (ID==-1){//bot
        var player = Object.create(AI);
        switch (name) {
            case 'EasyAI':
                player.level = 1;
                break;
            case 'MediumAI':
                player.level = 4;
                break;
            case 'HardAI':
                player.level = 7;
                break;
            case 'ImpossibleAI':
                player.level = 10;
                break;
            default:
                player.level = 1;
        }
    } else {
        var player = Object.create(Player);
        player.ID = ID;
    }
    player.name = name;
    return player;
}

function remotePlay(ID, pot){
    if (board.players['1'].ID == ID){
        var player = board.players['1'];
    } else if (board.players['-1'].ID == ID){
        var player = board.players['-1'];
    } else {
        return 0;
    }
    console.log("remotePlay by "+player.name+': '+pot)
    
    player.taketurn(board, pot);
    return 1;
}

function getCursorPosition(event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    //console.log("x: " + x + " y: " + y);
    return {x: x, y: y};
}

canvas.addEventListener('click', function(event) {
    var pos = getCursorPosition(event);
    
    if (!board.started){
        //createGame('Me',0,'MediumAI',-1);
    } else if (board.gameover){
        board.started = false;
        for (var p in board.pots) {
            var pot = board.pots[p];
            for (var b in pot.beans) {
                var bean = pot.beans[b];
                bean.free = true;
            }
        }
    } else if (board.started && board.ready){
        board.click(pos);
    }
}, false);

function distance(p1, p2){
    return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
}

var mainloop = function() {
    updateGame();
    drawGame();
};

var animFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        null ;

if ( animFrame !== null ) {
    var recursiveAnim = function() {
        mainloop();
        animFrame( recursiveAnim, canvas );
    };

    // start the mainloop
    animFrame( recursiveAnim, canvas );
} else {
    var ONE_FRAME_TIME = 1000.0 / 60.0 ;
    setInterval( mainloop, ONE_FRAME_TIME );
}