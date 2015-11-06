"use strict";

var util = require('util');
var utils = require('../lib/utils');
var async = require('async');
var Base = require('../lib/robotex').Robot;
var fs = require('fs');
var Browser = require("zombie"); //TS: use v2.5.1 npm install --save zombie@2.5.1

var Robot = function(guid, userid, username) {
    Base.call(this, guid, userid, username);
};

util.inherits(Robot, Base);

exports.Robot = Robot;

Robot.prototype.login = function() {
    var self = this;

    if (!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}/.test(self.username)) {
        return self.login_fail('Please enter a valid email address for BrowserStack');
    }
    var user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/535.20 (KHTML, like Gecko) Chrome/19.0.1036.7 Safari/535.20';

    //TS: creating zombie browser, and logging in with zombie
    var browser = new Browser({userAgent: user_agent, debug: true, waitFor: 20000});

    var url = 'https://buffer.com/';
    browser.visit(url, function(){
        browser.clickLink(".js-sign-in", function(){
            self.log(browser.cookies);
            browser.fill('#email', self.username)
            .fill('#password', self.password)
            .pressButton('input.submit-primary', function(){
                var body = browser.html();
                if (/doesn't look like a valid email address/i.test(body)) return self.login_fail("That doesn't look like a valid email address, try another?");
                if (/we don't have a Buffer account with that email address/i.test(body)) return self.login_fail("It looks like we don't have a Buffer account with that email address, try another?");
                if (/double check your password/i.test(body)) return self.login_fail("It looks like those signin details aren't quite right, double check your password?");
                if (!/My Account/i.test(body)) return self.fail('Expected to be logged in');

                self.save_cookies_to_node_cookie_jar(browser);
                self.log(browser.cookies);
                return self.logged_in(self.get_cheerio(body));
            })
        })
    })

    // self.browser_go('https://buffer.com/', function (url, page, body) {
    //     page.evaluate_with_click(function(username, password) {
    //         $('.js-sign-in').click();
    //         $('#email').val(username);
    //         $('#password').val(password);
    //         clickElement($('input.submit-primary')[0]);
    //     }, self.username, self.password, function(url, page, body) {
    //         if (/doesn't look like a valid email address/i.test(body)) return self.login_fail("That doesn't look like a valid email address, try another?");
    //         if (/we don't have a Buffer account with that email address/i.test(body)) return self.login_fail("It looks like we don't have a Buffer account with that email address, try another?");
    //         if (/double check your password/i.test(body)) return self.login_fail("It looks like those signin details aren't quite right, double check your password?");
    //         if (!/My Account/i.test(body)) return self.fail('Expected to be logged in');

    //         self.browser_finished(page);
    //         return self.logged_in(self.get_cheerio(body));
    //     })
    // })
}

Robot.prototype.save_cookies_to_node_cookie_jar = function(zombie_browser){
    var self = this;
    var cookies = [];
    for (var k in zombie_browser.cookies){
        var cookie = {};
        var str=zombie_browser.cookies[k].toString();
        self.log(str, "cyan");
        var name = str.split("=")[0];
        cookie["str"] = str;
        self.log(name, "magenta");
        self.log(zombie_browser.getCookie(name),"yellow");
        for (var prop in zombie_browser.getCookie(name, true)){
            cookie[prop] = zombie_browser.getCookie(name, true)[prop];
        }
        cookies.push(cookie);
    }
    self.debug(cookies,"green");
    self._jar.cookies = cookies;
}

Robot.prototype.logged_in = function($) {
    var self = this;

    self.feedback_logged_in();
    self.account_number = self.username;

    var csrf_token = $("input[name='csrf_token']").val();
    self.debug(csrf_token, "blue");
    self.jget("https://bufferapp.com/api/1/invoices.json?&csrf_token=" + csrf_token, function (req, json) {
        if (!json) return self.fail('Something when wrong when trying to get json data');

        var all_bills = json.map(function(bill_json) {

            // Bill date is given as the number of seconds after January 1, 1970
            var date = new Date(1970,0,1);
            date.setSeconds(bill_json.created_at);
            return {
                bill_date: date,
                amount: bill_json.amount,
                bill_link: "https://bufferapp.com/invoices/" + bill_json.identifier
            }
        })

        self.log(all_bills, 'magenta');
        self.log('Found ' + all_bills.length + ' bills', 'green');

        if (all_bills.length <= 0) {
            return self.no_ebills_available();
        }

        self.set_account_number(self.account_number);
        self.set_bill_date(all_bills[0].bill_date);
        self.set_amount(all_bills[0].amount);
        self.set_document_type('Invoice');

        if (self.should_fetch()) {
            self.get_and_upload_pdf(all_bills[0].bill_link, function(err) {
                if (err) return self.fail(err);

                if (self.fetch_history()) {
                    all_bills.shift();
                    self.get_history(all_bills, function(err) {
                        if (err) return self.fail(err);
                        return self.success('Got latest bills and history');
                    })
                } else {
                    self.log('Finished: Got latest bill but already have history', 'green');
                    return self.success('Done');
                }
            })
        } else {
            self.log('Finished: Already seen latest bill', 'green');
            return self.success('Done');
        }
    })
}

Robot.prototype.get_history = function(rest_bills, history_callback) {
    var self = this;
    self.feedback_history();

    async.eachSeries(rest_bills, function(bill, historical_bill_callback) {
        self.set_historical();
        self.set_account_number(self.account_number);
        self.set_bill_date(bill.bill_date);
        self.set_amount(bill.amount);
        self.set_document_type('Invoice');
        self.get_and_upload_pdf(bill.bill_link, historical_bill_callback);
    }, history_callback);
}
