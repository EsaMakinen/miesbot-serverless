'use strict';

let cheerio = require('cheerio')
let request = require('request');
let Twitter = require('twitter');

var globalEvent;
var globalCallback;

function tweetPhrase(phrase) {

    console.log("Sending to twitter: " + phrase)

    var client = new Twitter({
        consumer_key: process.env.consumer_key,
        consumer_secret: process.env.consumer_secret,
        access_token_key: process.env.access_token_key,
        access_token_secret: process.env.access_token_secret
    });

    client.post('statuses/update', { status: phrase }, function(error, tweet, response) {
          if (error) throw error;
      });

    const responsethis = {
        statusCode: 200,
        body: JSON.stringify({
            message: phrase,
            input: globalEvent,
        }),
    };

    globalCallback(null, responsethis);
}


function checkLinkValidity(index, linkarray) {
    console.log("checkLinkValidity processing=" + linkarray[index]);

    if (linkarray[index] == undefined) return false;

    if (linkarray[index].indexOf("valioliiga.com") == -1 && linkarray[index].indexOf("laliiga.com") && linkarray[index].indexOf("leijonat.com") == -1) {
        request(linkarray[index], function(error, response, body) {
            error && console.log('error:', error); // Print error 

            // Parse result
            let $ = cheerio.load(body);

            // Remove extras
            let foundString = $("body").text();
            let loydetty = foundString.match(/mies\s.{20,110}\./i);
            let okToTweet = true;

            if (loydetty != null) {
                // Check that found text is good and remove evil cases

                if (loydetty[0].indexOf("tappoi") != -1) okToTweet = false;
                if (loydetty[0].indexOf("taposta") != -1) okToTweet = false;
                if (loydetty[0].indexOf("raiskasi") != -1) okToTweet = false;
                if (loydetty[0].indexOf("surmasi") != -1) okToTweet = false;
                if (loydetty[0].indexOf("surmanneensa") != -1) okToTweet = false;
                if (loydetty[0].indexOf("surman") != -1) okToTweet = false;
                if (loydetty[0].indexOf("kuoli") != -1) okToTweet = false;
                if (loydetty[0].indexOf("lapsi") != -1) okToTweet = false;
                if (loydetty[0].indexOf("lapseen") != -1) okToTweet = false;
                if (loydetty[0].indexOf("lasten") != -1) okToTweet = false;
                if (loydetty[0].indexOf("lasta") != -1) okToTweet = false;
                if (loydetty[0].indexOf("tytön") != -1) okToTweet = false;
                if (loydetty[0].indexOf("pojan") != -1) okToTweet = false;
                if (loydetty[0].indexOf("puukolla") != -1) okToTweet = false;
                if (loydetty[0].indexOf("puukotti") != -1) okToTweet = false;

            }


            // If the whole set has not been iterated, do the next
            if ((loydetty == null || okToTweet == false) && linkarray.length > index) checkLinkValidity(index + 1, linkarray);
            //if ((loydetty == null) || linkarray.length > index) checkLinkValidity(index + 1, linkarray);


            if (loydetty != null && okToTweet == true) {
                let phrase = loydetty[0].capitalizeFirstLetter() + " " + linkarray[index];
                console.log(phrase);
                tweetPhrase(phrase);
            }
        });

    } else {
        if (linkarray.length > index) checkLinkValidity(index + 1, linkarray);
    }



}


module.exports.searchMiesPhrase = (event, context, callback) => {

    globalEvent = event;
    globalCallback = callback;
    var links = [];


    console.log(process.env);

    String.prototype.capitalizeFirstLetter = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }

    request('http://www.ampparit.com/haku?q=mies&t=news', function(error, response, body) {
        error && console.log('error:', error); // Print the error if one occurred 
        response.statusCode != "200" && console.log('statusCode:', response && response.statusCode); // Print the response status code

        // Parse links from Ampparit
        let $ = cheerio.load(body);

        // Iterate news items
        $(".news-item-wrapper").each(function(index, value) {
            links.push($(".news-item-headline", this).attr("href"));
        });

        checkLinkValidity(0, links);

    });
};