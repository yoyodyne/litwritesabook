# Usage

This is the source that you can modify/use on your own and create enhancements on existing LiveNote bundle.

Here's the files you need to keep an eye on:

* **app.js**: the main application file. LiveNote runs as a Node.js application on the server. The server waits for changes in the note file from its clients (connected computers) and displays changes accordingly.
* **index.html**: the front page of www.livenote.org. Modify it as you wish.

We found that the ideal suitable time interval for the writing-cursor to be inactive *after* person 1 stopped writing, was 2 seconds. You can modify it to suit your need.

## A few points to remember
1. The app.js already supports creation of random URLs as the IDs of your notes. 
2. LiveNote currently does not use `https`. But that shouldn't stop you from trying it out on your own version.
3. The notes can be accessed if someone tries to *guess* the note ID and successfully manages to do so. Hence, randomization is preferred and is controllable by code.
4. We shipped LiveNote without a signup and login. That was intentional to keep it simple and fast.

## Queries and support
For the sake of clarity, we release LiveNote under the [GNU GPLv3](https://www.gnu.org/copyleft/gpl.html) license. We do love to help you out if you run into problems using LiveNote source code.

Contact us by email on [mail@theoctal.com](mailto:mail@theoctal.com) or tweet us [@OctalHQ](http://twitter.com/octalhq).

Enjoy!
