'use strict';

let cheerio = require('cheerio')
let request = require('request');
let Twitter = require('twitter');

function tweetPhrase(phrase) {


    var client = new Twitter({
        consumer_key: process.env.consumer_key,
        consumer_secret: process.env.consumer_secret,
        access_token_key: process.env.access_token_key,
        access_token_secret: process.env.access_token_secret

    });

    // Post the tweet if in prod, else just write to log
    if (process.env.environment == "prod") {
        console.log("Sending to twitter: " + phrase)

        client.post('statuses/update', { status: phrase }, function(error, tweet, response) {
            if (error) {
                console.log(response["body"]);
                throw error;
            }
        });
    } else {
        console.log("Not in prod, so this would be sent: " + phrase)
    }

}


function checkLinkValidity(index, linkarray) {
    console.log("checkLinkValidity is processing = " + linkarray[index]);

    if (linkarray[index] == undefined) return false;

    // Remove some non-functioning sites and do the request
    if (linkarray[index].indexOf("valioliiga.com") == -1 && linkarray[index].indexOf("laliiga.com") && linkarray[index].indexOf("leijonat.com") == -1) {
        request(linkarray[index], function(error, response, body) {
            error && console.log('error:', error); // Print error 

            // Parse result
            let $ = cheerio.load(body);

            // Remove extras
            let foundString = $("body").text();
            let loydetty = foundString.match(/mies\s.{20,110}\./i);
            let okToTweet = true;

            // Check that found text is good and remove evil cases
            if (loydetty != null) {
                let evils = ['tappoi', 'taposta', 'raiskasi', 'surmasi', 'surmanneensa', 'surman', 'kuoli', 'lapsi', 'lapseen', 'lasten', 'lasta', 'tytön', 'pojan', 'puukolla', 'puukotti'];

                for (var evil in evils) {
                    if (loydetty[0].indexOf(evil) != -1) okToTweet = false;
                }
            }


            // If good not found and the whole set has not been iterated, do the next
            if ((loydetty == null || okToTweet == false) && linkarray.length > index) checkLinkValidity(index + 1, linkarray);

            // If everything is ok, tweet the phrase with link
            if (loydetty != null && okToTweet == true) {
                tweetPhrase(loydetty[0].capitalizeFirstLetter() + " " + linkarray[index]);
            }
        });

    } else {
        if (linkarray.length > index) checkLinkValidity(index + 1, linkarray);
    }
}


String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}


module.exports.searchMiesPhrase = (event, context, callback) => {

    var links = [];

    // Find all links containing "mies"
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