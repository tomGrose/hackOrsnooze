$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navLinks = $("#main-nav-links");
  const $favArticles = $("#favorited-articles");
  const $userArticles = $("#my-articles");
  const $profileLink = $("#nav-user-profile");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();
  

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

    // star the users favorites
    starFavorites();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
    // Star them favorites
    starFavorites()
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <span class='star'><i class='far fa-star'></i></span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favArticles,
      $userArticles
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navLinks.show();
    $("#nav-welcome").toggle();
    $profileLink.append($(`<p>${currentUser.username}</p>`))
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }

  // EVENT HANDLERS

  //show submit form when it is clicked on in the nav
  $("nav").on("click", "#nav-submit-story", function() {
    $submitForm.toggle();
  });

  //Show favorites list when clicked on
  $("nav").on("click", "#nav-favorites", function() {
    hideElements();
    $favArticles.toggle();
    populateUserFavs();
  });

  //Show My Stories list when clicked on
  $("nav").on("click", "#nav-my-stories", function() {
    hideElements();
    $userArticles.toggle();
    populateOwnArticles();
  });

  //Show My Stories list when clicked on
  $("body").on("click", ".dltButton", function() {
    handleStoryDelete($(this).parent().attr('id'));
  });

  // Handle story submit
  $submitForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit
    submitStory();
    // reset form
    $submitForm.trigger("reset");
  });

  // Create event listener that calls handle fav clicks when a star is clicked
  $("body").on("click", ".fa-star", async function() {
    if (!currentUser){
      return;
    } else {
      const $clickedStar = $(this);
      const clickedStoryId = $(this).parents("li").attr('id');
      handleFavClicks(clickedStoryId, $clickedStar);
    }
    
  });
  
  $("#nav-welcome").on("click", $profileLink, function() {
    $("#user-profile").toggle();
    populateUserprofile()
  }); 

  // SUBMIT FORM FUNCTIONALITY

  // get new story values from submit form, call addStory method on storyList class. Generate stories so the Dom updates
  async function submitStory(){
    const story = {author: $("#author").val(), title: $("#title").val(), url: $("#url").val()};
    const newStory = await StoryList.addStory(currentUser, story);
    const usersStories = await currentUser.updateOwnStories();
    generateStories();
    populateOwnArticles();
  }

// USER FAVORITES FUNCTIONALITY

  // Look through user's favorites to see if the clicked star is in it. If it is uncheck star and remove from favorites
  // If it is not add to favorites
  //User methods will updates currentUsers favs array either way
  function handleFavClicks(id, $star){
    let inFavs = false;
    $star.toggleClass('fas');
    $star.toggleClass('far');
    // use a true false toggle so the api is only being called once when we find out whether the story is in favorites
    for (story of currentUser.favorites){
      if (story.storyId === id){
        inFavs = true;
      }
    }
    if (inFavs) {
      currentUser.removeFavStory(id);
    } else {
      currentUser.addFavStory(id);
    }
  }

  //check the stories on the page and highlight stars if in users favorites
  function starFavorites(){
    if(currentUser){
      const storyIds = Array.from($('li').attr('id'));
      for (story of currentUser.favorites){
        const favId = story.storyId;
        $(`#${favId}`).find('i').toggleClass('far');
        $(`#${favId}`).find('i').toggleClass('fas');
      }
    }
  }

  // Find the users favorited articles and populate them when user clicks on favorites.
  function populateUserFavs() {
    $favArticles.html("");
    if (currentUser.favorites.length === 0){
      $favArticles.append($("<h4>You have no favorites yet!</h4>"));
    } else {
      for (story of currentUser.favorites){
        const storyMarkup = generateStoryHTML(story);
        $favArticles.prepend(storyMarkup);
      }
      $("i").toggleClass('far')
      $("i").toggleClass('fas')
    }
  }

// USERS OWN STORIES FUNCTIONALITY

// populate users own articles under my storys
  async function populateOwnArticles() {
    // empty the article holding the stories
    $userArticles.html("");
    //retrieve user's own stories from the API
    const ownStories = await currentUser.updateOwnStories();
    if (ownStories.length === 0){
      $userArticles.append($("<h4>You have no stories!</h4>"));
    } else {
      // Generate markup and append to the DOM
      for (story of ownStories){
        const storyMarkup = generateStoryHTML(story);
        $userArticles.prepend(storyMarkup);
      }
      // Remove the favorite stars and add a delete button
      $userArticles.find("span").remove();
      $userArticles.find("li").append($("<button class='dltButton'>Delete Story</button>"));
    }
  }

  // Handle the delete button for a users own stories
  async function handleStoryDelete(id){
    // delete the story
    const dltedStory = await currentUser.deleteStory(id);
    // retrieve the users updated stories from the API
    //const ownStories = await currentUser.updateOwnStories();
    populateOwnArticles();
  }
  
  // POPULATE USER PROFILE

  function populateUserprofile() {
    if (currentUser){
      $("#profile-name").text(`Name: ${currentUser.name}`);
      $("#profile-username").text(`Username: ${currentUser.username}`);
      $("#profile-account-date").text(`Account Created: ${currentUser.createdAt.slice(0,10)}`);
    }
  }

});


