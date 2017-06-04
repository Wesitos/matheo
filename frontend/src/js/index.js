import 'materialize-css/dist/js/materialize';
import _ from 'lodash';
import $ from 'jquery';
import swal from 'sweetalert2';
import Handlebars from 'handlebars';
import stampit from 'stampit';
import SerialPort from 'serialport';
import {Howl} from 'howler';
import '../styles/index.scss';

import {food as foodData} from './game-data';

swal('Suma los precios');

// Usamos un singleton para la biblioteca de sonidos
const soundLibrary = (stampit()
      .init(function init(audioPaths) {
        const audioCache = {};
        Object.keys(audioPaths).forEach((audioName) => {
          audioCache[audioName] = new Howl({
            src: audioPaths[audioName],
            autoplay: false,
          });
        });
        this.audioCache = audioCache;
      })
      .methods({
        play(audioName) {
          const audio = this.audioCache[audioName];
          if (audio) {
            audio.play();
          }
        },
        stop(audioPath) {
          const audio = this[audioPath];
          if (audio) {
            audio.stop();
          }
        },
      }))({ // Inicializacion de la biblioteca de sonidos
        goodMove: require('../audio/good_move.wav'),
        badMove: require('../audio/pop.wav'),
        background: require('../audio/background.mp3'),
      });


const foodFactory = stampit()
      .init(function init(foodArray) {
        this.foodArray = foodArray;
      })
      .methods({
        getRandomFood(level) {
          return _.range(level).map(
            () => this.foodArray[Math.floor(Math.random() * 9)]);
        },
      });

const playerFactory = stampit()
      .props({
        level: 1,
        coins: 0,
        lifes: 3,
        time: 1000,
        playerTimer: null,
      })
      .methods({
        incrementLevel() {
          this.level += 1;
          return true;
        },
        addCoins(coins = 0) {
          this.coins += coins;
        },
        addFill(newfill) {
          const currentfill = this.time;
          if ((currentfill + newfill) >= 100) {
            this.time = 1000;
            this.incrementLevel();
          } else {
            this.time += newfill;
          }
        },
        goodMove() {
          const currentLevel = this.level;
          const newfill = 500;
          const newcoins = Math.floor(10 + (0.5 * currentLevel));
          this.addFill(newfill);
          this.addCoins(newcoins);
          this.incrementTime(20);
        },
        badMove() {
          this.lifes = this.lifes - 1;
        },
        initTimer() {
          if (this.playerTimer) {
            clearTimeout(this.playerTimer);
          }
          this.playerTimer = setInterval(() => this.reduceTime(), 100);
        },
        incrementTime(add) {
          const newTime = this.time + add;
          this.time = Math.min(newTime, 1000);
        },
        reduceTime() {
          if (swal.isVisible()) {
            return;
          }
          this.time -= 1 + (0.5 * this.level);
          if (this.time < 0) {
            this.badMove();
          }
        },
        destroy() {
          clearTimeout(this.playerTimer);
        },
      });

const cashRegisterFactory = stampit()
      .props({
        currentPrice: 0,
      }).methods({
        setCurrentPrice(price) {
          this.currentPrice = price;
        },
      });


const octopusFactory = stampit()
      .init(function init() {
        this.player = playerFactory();
        this.cashRegister = cashRegisterFactory();
        this.food = foodFactory(foodData);
        this.currentFood = [];
      }).methods({
        verifyResult(value) {
          if (value === this.cashRegister.currentPrice) {
            this.player.goodMove();
            return true;
          }
          this.player.badMove();
          return false;
        },
        initTimer() {
          this.player.initTimer();
        },
        reset() {
          this.player.destroy();
          this.player = playerFactory();
        },
        getFood() {
          const food = this.food.getRandomFood(this.player.level);
          this.currentFood = food;
          this.cashRegister.setCurrentPrice(food.reduce((r, {price}) => r + price, 0));
          return food;
        },
        destroy() {
          this.player.stopTimer();
        },
      });


const userViewFactory = stampit()
    .init(function init(octopus) {
      this.octopus = octopus;
    })
    .methods({
      renderPlayerZone() {
        const lifes = this.octopus.player.lifes;
        const dead = 3 - lifes;

        const goodLifesHtmlTemplate = $('#good-lifes-template').html();
        const goodLifesTemplate = Handlebars.compile(goodLifesHtmlTemplate);
        const lifesLayout = $('#lifes-layout');
        lifesLayout.html('');
        // Agrega la plantilla `lifes`-veces
        _.range(lifes).forEach(() => lifesLayout.append(goodLifesTemplate()));

        const badLifesHtmlTemplate = $('#bad-lifes-template').html();
        const badLifesTemplate = Handlebars.compile(badLifesHtmlTemplate);
        // agrega la plantilla `dead`-veces
        _.range(dead).forEach(() => lifesLayout.append(badLifesTemplate()));
      },
      renderLevel() {
        const level = this.octopus.player.level;
        const fill = this.octopus.player.time / 10;
        const fillWidth = `${fill}%`;
        $('#level-bar').css('width', fillWidth);
        $('#level-number').html(level);
      },
      renderCoins() {
        const coins = this.octopus.player.coins;
        const coinsHtmlTemplate = $('#coins-template').html();
        const coinsTemplate = Handlebars.compile(coinsHtmlTemplate);
        const coinsLayout = $('#coins-layout');
        coinsLayout.html('');
        const html = coinsTemplate({coins});
        coinsLayout.append(html);
      },
    });


const fruitViewFactory = stampit()
    .init(function init(octopus) {
      this.octopus = octopus;
    }).methods({
      render() {
        const fruitHtmlTemplate = $('#fruit-template').html();
        const fruitTemplate = Handlebars.compile(fruitHtmlTemplate);
        const fruitLayout = $('#fruits-layout');
        fruitLayout.html('');
        const fruits = this.octopus.getFood();

        fruits.forEach(fruit => fruitLayout.append(fruitTemplate(fruit)));
      },
    });


const boxViewFactory = stampit()
      .props({
        isMounted: false,
      })
      .init(function init(octopus) {
        this.value = 0;
        this.octopus = octopus;
      })
      .methods({
        componentDidMount() {
          const self = this;
          const boxLayout = $('#keyboard-input');
          const answerInput = $('#answer_input');
          answerInput.text(0);

          boxLayout.on('click', '.number-button', function onClick() {
            soundLibrary.play('badMove');
            const digit = $(this).children().first()[0].text;
            self.insertDigit(digit);
          });
        },
        insertDigit(digit) {
          const answerInput = $('#answer_input');
          if (digit === 'C') {
            this.value = 0;
          } else {
            this.value = (10 * this.value) + parseInt(digit, 10);
          }
          answerInput.text(this.value);
        },
        render() {
          const boxButtonHtmlTemplate = $('#number-button-template').html();
          const boxButtonTemplate = Handlebars.compile(boxButtonHtmlTemplate);
          const boxLayout = $('#keyboard-input');
          boxLayout.html('');
          _.range(1, 10).concat(0, 'C').forEach(
            i => boxLayout.append(boxButtonTemplate({number: i})));

          if (!this.isMounted) {
            this.isMounted = true;
            this.componentDidMount();
          }
        },
        reset() {
          const answerInput = $('#answer_input');
          answerInput.text(0);
          this.value = 0;
        },
      });

const senderViewFactory = stampit()
      .init(function init({octopus, fruitView, boxView, userView}) {
        this.octopus = octopus;
        this.fruitView = fruitView;
        this.boxView = boxView;
        this.userView = userView;
      })
      .methods({
        send() {
          const answerInput = $('#answer_input');
          const input = parseInt(answerInput.text(), 10);
          if (input !== 0) {
            const result = this.octopus.verifyResult(input);
            if (result) {
              soundLibrary.play('goodMove');
            } else {
              this.octopus.player.time = 1000;
              swal('Oh!', 'Keep pushing!', 'error');
            }
            const lifes = this.octopus.player.lifes;
            if (lifes === 0) {
              swal('Game over!', 'Keep Trying', 'error');
              this.octopus.reset();
            }
            this.fruitView.render();
            this.userView.renderPlayerZone();
          }
          this.boxView.reset();
          this.userView.renderCoins();
        },
        render() {
          const sendButton = $('#send_button');
          sendButton.on('click', () => this.send());
        },
      });

const mainViewFactory = stampit()
      .props({
        renderLevelTimer: null,
        serial: null,
      })
      .init(function init() {
        const octopus = octopusFactory();
        const fruitView = fruitViewFactory(octopus);
        const boxView = boxViewFactory(octopus);
        const userView = userViewFactory(octopus);
        const senderView = senderViewFactory({
          octopus, fruitView, boxView, userView,
        });

        this.octopus = octopus;
        this.fruitView = fruitView;
        this.boxView = boxView;
        this.userView = userView;
        this.senderView = senderView;
      }).methods({
        openSerial() {
          if (this.serial) {
            this.serial.close();
            this.serial = null;
          }
          SerialPort.list((err, ports) => {
            const availablePorts = _.filter(ports, port => port.productId);
            console.log(ports);
            if (!availablePorts.length) {
              console.log('Not available ports');
              return setTimeout(() => this.openSerial(), 1000);
            }
            const serial = new SerialPort(availablePorts[0].comName, {
              baudRate: 9600,
            });
            this.serial = serial;

            serial.on('open', () => console.log('SerialPort opened'));
            serial.on('data', (buf) => {
              swal.close();
              const digit = buf.toString();
              if (!isNaN(parseInt(digit, 10))) {
                return this.boxView.insertDigit(digit);
              }
              switch(digit) {
                case 'E':
                  this.senderView.send(); break;
                case 'B':
                  this.boxView.insertDigit('C'); break;
                case 'R':
                  this.restart(); break;
              }
            });
            serial.on('error', () => this.openSerial());
          });
        },
        componentDidMount() {
          this.openSerial();
        },
        render() {
          this.octopus.initTimer();
          this.fruitView.render();
          this.boxView.render();
          this.senderView.render();
          this.userView.renderPlayerZone();
          this.userView.renderCoins();
          setInterval(() => this.userView.renderLevel(), 100);
        },
        restart() {
          this.octopus.reset();
          this.render();
        },
        destroy() {
          clearTimeout(this.renderLevelTimer);
          this.serial.close();
        },
      });

const mainView = mainViewFactory();
mainView.render();
mainView.componentDidMount();

window.soundLibrary = soundLibrary;
