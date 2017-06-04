import 'materialize-css/dist/js/materialize';
import _ from 'lodash';
import $ from 'jquery';
import swal from 'sweetalert2';
import Handlebars from 'handlebars';
import stampit from 'stampit';
import {Howl} from 'howler';
import '../styles/index.scss';

import {food as foodData} from './game-data';

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
        play(audioPath) {
          const audio = this[audioPath];
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
        fill: 0,
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
          const currentfill = this.fill;
          if ((currentfill + newfill) >= 100) {
            this.fill = 0;
            this.incrementLevel();
          } else {
            this.fill += newfill;
          }
        },
        goodMove() {
          const currentLevel = this.level;
          const newfill = (15 + (30 / currentLevel));
          const newcoins = (30 / currentLevel);
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
          if (newTime > 1000) {
            this.time = 1000;
          } else {
            this.time = newTime;
          }
        },
        reduceTime() {
          this.time -= 1;
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
        restartGame() {
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
            if (digit === 'C') {
              self.value = 0;
            } else {
              self.value = (10 * self.value) + parseInt(digit, 10);
            }
            answerInput.text(self.value);
          });
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
        onClickHandler() {
          const answerInput = $('#answer_input');
          const result = this.octopus.verifyResult(
            parseInt(answerInput.text(), 10));
          if (result) {
            soundLibrary.play('goodMove');
          } else {
            swal('Oh!', 'Keep pushing!', 'error');
          }
          const lifes = this.octopus.player.lifes;
          if (lifes === 0) {
            swal('Game over!', 'Keep Trying', 'error');
            this.octopus.restartGame();
          }
          this.fruitView.render();
          this.boxView.reset();
          this.userView.renderCoins();
          this.userView.renderPlayerZone();
        },
        render() {
          const self = this;
          const sendButton = $('#send_button');
          sendButton.on('click', () => this.onClickHandler());
        },
      });

const mainViewFactory = stampit()
      .props({
        renderLevelTimer: null,
        startTime: null,
      })
      .init(function init() {
        const octopus = octopusFactory();
        const fruitView = fruitViewFactory(octopus);
        const boxView = boxViewFactory(octopus);
        const userView = userViewFactory(octopus);
        console.log(userView);
        console.log(boxView);
        console.log(fruitView);
        const senderView = senderViewFactory({
          octopus, fruitView, boxView, userView,
        });

        this.octopus = octopus;
        this.fruitView = fruitView;
        this.boxView = boxView;
        this.userView = userView;
        this.senderView = senderView;
      }).methods({
        render() {
          this.octopus.initTimer();
          this.fruitView.render();
          this.boxView.render();
          this.senderView.render();
          this.userView.renderPlayerZone();
          this.userView.renderCoins();
          requestAnimationFrame(() => this.step());
          setInterval(() => this.userView.renderLevel(), 100);
        },
        destroy() {
          clearTimeout(this.renderLevelTimer);
        },
      });

const mainView = mainViewFactory();
mainView.render();
