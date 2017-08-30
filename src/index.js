'use strict';

const Alexa = require('alexa-sdk');
const https = require('https');
const crypto = require('crypto');

const APPLI_ID = '<your alex skill id>';
const MARVEL_PUBLIC_KEY='<Marvel api public key>';
const MARVEL_PRIVATE_KEY='<Marvel api private key>';
const numberOfResults = 2;
var output ="";
var alexa; 

const languageStrings = {
    'en': {
        translation: { 
            SKILL_NAME: 'Marvel Heros',
            WELCOME_MESSAGE: "You can ask me for an marvel hero name. Who will it be?",
            GET_FACT_MESSAGE: "You asked about the character, ",
            NOT_FOUND_MESSAGE: "I did any further description of this character.",
            HELP_MESSAGE: 'You can ask me for a marvel hero that starts with a name?',
            HELP_REPROMPT: 'Name a hero from marvel universe',
            STOP_MESSAGE: 'Goodbye!',
        },
    },
    'en-US': {
        translation: { 
            SKILL_NAME: 'American Marvel Heros',
        },
    },
    'en-GB': {
        translation: { 
            SKILL_NAME: 'British Marvel Heros',           
        },
    },
    'de': {
        translation: { 
            SKILL_NAME: 'Wunderheld',
            WELCOME_MESSAGE: "Sie können mich um einen Wunderheld Namen bitten. Wer wird es sein?",
            GET_FACT_MESSAGE: "Sie fragten nach dem Charakter, ",
            NOT_FOUND_MESSAGE: "ch habe bei diesem Namen keinen Helden gefunden.",
            HELP_MESSAGE: 'Sie können mich um einen Wunderheld bitten, der mit einem Namen beginnt ?',
            HELP_REPROMPT: 'Nennen Sie einen Helden aus dem Wunderuniversum',
            STOP_MESSAGE: 'Auf Wiedersehen!',
        },
    },
};

const handlers = {
    'LaunchRequest': function () {
        output = this.t('WELCOME_MESSAGE');
        this.emit(':ask', output, this.t('HELP_MESSAGE'));
    },
    'getHeroIntent': function () {
        var slotValue = '';
        var heroName =''
        if(this.event.request.intent.slots.hero ) {
            if (this.event.request.intent.slots.hero.value) {
                slotValue = this.event.request.intent.slots.hero.value;
                heroName = encodeURI(slotValue);
                console.log(' Got hero name from slot ' + slotValue);
            }
        }
        var introText = this.t('GET_FACT_MESSAGE') + slotValue + ". ";
        var description = this.t('NOT_FOUND_MESSAGE');
        httpGet(heroName, function (response) {

            // Parse the response into a JSON object ready to be formatted.
            var responseData = JSON.parse(response);
            var cardContent = "S.H.I.E.L.D found\n\n";
            // Check if we have correct data, If not create an error speech out to try again.
            if (responseData == null) {
                output = "There was a problem calling Shield database";
            }
            else {
                output = introText;
                // If we have data.
                for (var i = 0; i < responseData.data.results.length; i++) {
                    if (i < numberOfResults) {
                        // Get the name and description JSON structure.
                        var name = responseData.data.results[i].name;
                        var character_description = responseData.data.results[i].description;
                        if(character_description) {
                            description = character_description;
                        }
                        var comic = responseData.data.results[i].stories.available;
                        var index = i + 1;

                        output += "I found" + name+ "; and appears in " +comic+" stories.";
                        cardContent += "Marvel Character: " + name+ ".\n";
                        cardContent += "Appears in "+comic+" stories. \n Description: "+description + ".\n\n";
                    }
                }
                output += description;
            }
            var cardTitle = "Marvel Character:" + slotValue;

            alexa.emit(':tellWithCard', output, cardTitle, cardContent);
        });
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        this.emit('SessionEndedRequest');
    },
    'SessionEndedRequest':function () {
        this.emit(':tell', this.t("STOP_MESSAGE"));
    },
    'Unhandled': function () {
        this.attributes['speechOutput'] = this.t("HELP_MESSAGE");
        this.attributes['repromptSpeech'] = this.t("HELP_REPROMPT");
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech'])
    }
};
exports.handler = function (event, context, callback) {
    alexa = Alexa.handler(event, context);
    alexa.APP_ID = APPLI_ID;
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

// Create a web request and handle the response.
function httpGet(heroNameQuery, callback) {
    var timestamp = Date.now();
    var myHash = crypto.createHash('md5').update(timestamp+MARVEL_PRIVATE_KEY + MARVEL_PUBLIC_KEY).digest("hex");
    var options = {
        host: 'gateway.marvel.com',
        port: 443,
        path: '/v1/public/characters?nameStartsWith=' + heroNameQuery + '&limit=1&ts='+timestamp+'&apikey='+MARVEL_PUBLIC_KEY+'&hash=' + myHash,
        method: 'GET'
    };
    var req = https.get(options, (res) => {

        var body = '';
        console.log("STATUS: "+res.statusCode);
        res.on('data', (d) => {
            body += d;
        });

        res.on('end', function () {
            console.log('Successfully processed response')
            callback(body);
        });

    });
    req.end();

    req.on('error', (e) => {
        console.error(e);
    });
}

