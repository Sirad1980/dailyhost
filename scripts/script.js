const hostToday = 'Host today is: '
const hostTomorrow = 'Host tomorrow is: '
let sha1 ="";
let accessToken;
let username;
let repository;
let path;
let nextHostIndex =null;
let storedIndex = null;
let shiftExecuted = false;

const today = new Date();
today.setHours(0,0,0,0);
const day = new Date().getDay();

console.log("extension opened")


// MAIN BUTTON FUNCTIONS START //
async function fnHostToday(){
 
  _getFileContentsFromGitHub(function(data){
    const hostsArray = data.hosts;
    console.log("from host fn : " + data.lastGeneratedHostIndex)
    const daysPassed = (today / (1000 * 3600 * 24)) % hostsArray.length;
    
    if(1 <= day && day <= 5){

      nextHostIndex = Math.abs(Math.round(((daysPassed) % hostsArray.length)-1));
      
      if (day === 1) {
        console.log("codeExecuted: "+ localStorage.getItem('codeExecuted'))
        if (localStorage.getItem('codeExecuted') !== 'true'){
            let newArray = this._shiftRight(hostsArray, 2);
            _updateFileInGitHub("hostsArray", newArray)
    
            // Set the flag in localStorage to indicate the code has been executed
            localStorage.setItem('codeExecuted', 'true');
            
            _getFileContentsFromGitHub(function(data){
              hostsArray = data.hosts;
            })
        }else{
            document.querySelector('#label-text').innerHTML = "Host Today: "
            document.querySelector('#label').innerHTML = hostsArray[nextHostIndex]
        }
      } else if (day === 2 || day===3 || day===4){
        localStorage.setItem('codeExecuted', 'false');
      
      } else if (day === 5){
        //Store index on friday
        storedIndex = nextHostIndex;
        _updateFileInGitHub("hostIndex", storedIndex).then(()=>{
          console.log("Index " +storedIndex+" stored successfully.");
        })
        
      }
      document.querySelector('#label-text').innerHTML = "Host Today: "
      document.querySelector('#label').innerHTML = hostsArray[nextHostIndex]
    }else{
      document.querySelector('#label-text').innerHTML = "No hosts on weekends."
      document.querySelector('#label').innerHTML = ""
    }
  });
}

async function fnHostTomorrow(){
  _getFileContentsFromGitHub(function(data){
    const hostsArray = data.hosts;
    const daysPassed = today / (1000 * 3600 * 24) % hostsArray.length;
    console.log("Todays day :" + day )

    if(1 <= day && day<= 5){
      let nextHostIndex1 = Math.abs(Math.round(((daysPassed+1) % hostsArray.length)-1));
      if (day === 1) {

        document.querySelector('#label-text').innerHTML = "Host Tomorrow: "
        document.querySelector('#label').innerHTML = hostsArray[nextHostIndex1]
      
      }else if(day === 5){
        document.querySelector('#label-text').innerHTML = "Host On Monday: "
        document.querySelector('#label').innerHTML = hostsArray[nextHostIndex1]
      }else if(1 < day < 5){
        document.querySelector('#label-text').innerHTML = "Host Tomorrow: "
        document.querySelector('#label').innerHTML = hostsArray[nextHostIndex1]
      }

    }else{
      document.querySelector('#label-text').innerHTML = "No hosts on weekends."
      document.querySelector('#label').innerHTML = ""
    }
  });
}

//Skip host forward, rearrange array and write into file
async function fnSkipHostForward(){
  _getFileContentsFromGitHub(function(data){
    const hostsArray = data.hosts;
    current = document.querySelector('#label').innerHTML
    let newArray = this._shiftLeft(hostsArray);

    _updateFileInGitHub("hostsArray", newArray).then(()=>{
      document.querySelector('#label-text').innerHTML = "Host skipped forward. Start again."
      document.querySelector('#label').innerHTML = ""
    })
  });
}

//Skip host backward and rearrange array and write into file
async function fnSkipHostBackward(){
  _getFileContentsFromGitHub(function(data){
    const hostsArray = data.hosts;
    current = document.querySelector('#label').innerHTML
    let newArray = this._shiftRight(hostsArray);

    _updateFileInGitHub("hostsArray", newArray).then(()=>{
      document.querySelector('#label-text').innerHTML = "Host skipped backward. Start again."
      document.querySelector('#label').innerHTML = ""
    })
  });
}

// MAIN BUTTON FUNCTIONS END //

// INTERNAL FUNCTIONS START //
// Get File Contents
async function _getFileContentsFromGitHub(callback) {

    this._showProgressBar();
    fetch(`https://api.github.com/repos/${username}/${repository}/contents/${path}`, {
      method: 'GET',
      headers: {
        Authorization: `token ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    })
      .then(response => {
        this._hideProgressBar();
        if (!response.ok) {
          throw new Error('Network response was not ok.');
        }
        return response.json();
      })
      .then(data => {
        const encodedData = data.content;
        const decodedString = atob(encodedData); 
        const hostsDataJson = JSON.parse(decodedString)
        callback(hostsDataJson);
        
      })
      .catch(error => {
        console.error('Error retrieving data:', error);
      });   
}

// Update File
async function _updateFileInGitHub(art, newData) {
 // hosts, previousIndex
  this._showProgressBar();
    //Grab sha of the file we are changing
  fetch(`https://api.github.com/repos/${username}/${repository}/contents/${path}`, {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    }).then(response => {
      this._hideProgressBar();
      if (!response.ok) {
        throw new Error('Network response was not ok.');
      }                      
      return response.json();                               
    }).then(data => {
      const sha = data.sha;
      const currentContent = atob(data.content);
      const currentData = JSON.parse(currentContent);

      if(art=="hostsArray"){
        currentData.hosts = newData;
        console.log("New DATA: " + JSON.stringify(newData.hosts))
      }else if(art=="hostIndex"){
        currentData.lastGeneratedHostIndex = newData;
      }
      
      // Convert the updated object back to a JSON string
      const updatedContent = JSON.stringify(currentData);
      const encodedFile = btoa(updatedContent);

    //Make a PUT request to update the file
    return fetch(`https://api.github.com/repos/${username}/${repository}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update file',
        content: encodedFile,
        sha: sha,
      }),
    });
  }).then(response => response.json()
  ).then(data => {
    console.log('File updated successfully:', data);
  }).catch(error => console.error('Error updating file:', error));
}

function _shiftLeft(arr) {
  const firstElement = arr[0];
  for (let i = 0; i < arr.length - 1; i++) {
    arr[i] = arr[i + 1];
  }
  arr[arr.length - 1] = firstElement;
  return arr;
}

function _shiftLeftName(arr, name) {
  const firstElement = arr[0];
  for (let i = 0; i < arr.length - 1; i++) {
    arr[i] = arr[i + 1];
  }
  arr[arr.length - 1] = firstElement;
  return arr;
}

function _shiftRight(arr, places=1) {
  for (let j = 0; j < places; j++) {
    const lastElement = arr[arr.length - 1];
    for (let i = arr.length - 1; i > 0; i--) {
      arr[i] = arr[i - 1];
    }
    arr[0] = lastElement;
  }
  console.log(arr)
  return arr;
}

function _showProgressBar() {
  document.getElementById('progressContainer').style.display = 'block';
}

function _hideProgressBar() {
  document.getElementById('progressContainer').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
  // Load saved settings on page load
  loadSettings();

  // Add event listener for the settings form
  document.getElementById('settingsForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Get values from the form
    const repository = document.getElementById('repository').value;
    const username = document.getElementById('username').value;
    const path = document.getElementById('path').value;
    const accessToken = document.getElementById('accessToken').value;

    // Save the settings
    saveSettings(repository, username, path, accessToken);
    document.getElementById('label-text').innerHTML = "Generate daily host by clicking a button.";
    document.getElementById('label').innerHTML = '';
    loadSettings();
    
    // Close the settings dialog
    document.getElementById('settingsContainer').style.display = 'none';
  });
});

function saveSettings(repository, username, path, accessToken) {
  // Use chrome.storage to save settings
  chrome.storage.sync.set({
    repository: repository,
    username: username,
    path: path,
    accessToken: accessToken
  }, function() {
    console.log('Settings saved');
  });
}

function loadSettings() {
  // Use chrome.storage to load settings
  chrome.storage.sync.get(['repository', 'username', 'path', 'accessToken'], function(result) {
    document.getElementById('repository').value = result.repository || '';
    document.getElementById('username').value = result.username || '';
    document.getElementById('path').value = result.path || '';
    document.getElementById('accessToken').value = result.accessToken || '';
    repository = result.repository;
    username = result.username;
    path = result.path;
    accessToken = result.accessToken;
    console.log(result.repository)
  });
}

function getSettings() {
  // Default values if settings are not yet stored
  const defaultSettings = {
    repository: 'defaultRepo',
    username: 'defaultUser',
    path: 'defaultPath',
    accessToken: 'defaultToken'
  };

  // Retrieve settings from Chrome storage
  chrome.storage.sync.get(defaultSettings, function(result) {
    // Assign settings to constants
    repository = result.repository;
    username = result.username;
    path = result.path;
    accessToken = result.accessToken;
  });
}

// Team popup create list item programmatically
function createListItem(name, orderNr) {
  const parentDiv = document.getElementById("team-list");
  const liParent = document.createElement('li');
  liParent.setAttribute("id", "list-item")
  const p = document.createElement('p')
  p.setAttribute("id", "item-name")
  p.textContent = orderNr+".  "+name;

  const btnDelete = document.createElement('i');
  btnDelete.setAttribute("class", 'fas fa-user-minus')
  btnDelete.setAttribute("id", "list-item-delete")

  btnDelete.addEventListener('click', () => {
    const dialog = document.getElementById('dialogDeleteTeamMember');
    const overlay = document.getElementById('overlay');
    dialog.style.display = 'block';
    overlay.style.display = 'block';

    const okBtn = document.getElementById('okBtnDeleteTeamMember');
    const cancelBtn = document.getElementById('cancelDeleteTeamMember');

    okBtn.onclick = function () {
      liParent.remove();
      dialog.style.display = 'none';
      overlay.style.display = 'none';
      deleteListItem(name)
    };

    cancelBtn.onclick = function () {
      dialog.style.display = 'none';
      overlay.style.display = 'none';
    };
  });

  

  liParent.appendChild(p)
  liParent.appendChild(btnDelete)

  parentDiv.appendChild(liParent)
  
}



async function populateTeamsList(){
  _getFileContentsFromGitHub(function(data){
    const hostsArray = data.hosts;
    hostsArray.sort()
    for(host in hostsArray) {
      createListItem(hostsArray[host], (parseInt(host)+1))
    }
  });
}

async function deleteListItem(name) {
  _getFileContentsFromGitHub(function(data){
    let hostsArray = data.hosts;
    document.getElementById('dialogDeleteTeamMember').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    removeItem(hostsArray, name)
    deleteElements();
    document.getElementById("deletingItem").style.display='block'
    
  })
  // wait for 
  setTimeout(function(){ 
    populateTeamsList();
    document.getElementById("deletingItem").style.display='none'
    
}, 2000)
}

async function updateList(){
  deleteElements();
  document.getElementById("updatingList").style.display='block'
  
  setTimeout(function(){ 
    populateTeamsList();
    document.getElementById("updatingList").style.display='none'
    
}, 2000)
}

async function removeItem(array, valueForRemove){
  var index = array.indexOf(valueForRemove);

  if(index!=-1){
    array.splice(index, 1);
  }

  // save updated array
  _updateFileInGitHub("hostsArray", array).then(()=>{
    console.log(valueForRemove + " is Deleted. Data saved.")
    console.log(array)
  })

  document.querySelector('#label-text').innerHTML = "Team list has changed. Adjust Host position."
  document.querySelector('#label').innerHTML = ""
  
}

function deleteElements() {
  var allListItems = document.querySelectorAll('[id=list-item]');
  allListItems.forEach(function(element) {
      element.remove();
  });
}

function addTeamMember() {
  _getFileContentsFromGitHub(function(data){
    let hostsArray = data.hosts;
    const memberName = document.getElementById('inputNameAddTeamMember').value
    hostsArray.push(memberName);
    // console.log(hostsArray)
    document.getElementById('inputNameAddTeamMember').value = ''

    _updateFileInGitHub("hostsArray", hostsArray).then(()=>{
      console.log(memberName + " added to the Team. Data saved.")
      console.log(hostsArray)
    })

  })
  
  
}

// Add event listener to beforeunload event to delete elements when closing popup window


// INTERNAL FUNCTIONS END //


// Binding functions to buttons
document.getElementById('btnToday').addEventListener("click",fnHostToday)
document.getElementById('btnTomorrow').addEventListener("click",fnHostTomorrow)

document.getElementById('closeExtension').addEventListener('click', function() {
  window.close();
});

// ICONS ON THE TOP
document.getElementById('skip-next').addEventListener('click', function() {
  document.getElementById('dialogContainerForward').style.display = 'block';
});

document.getElementById('skip-previous').addEventListener('click', function() {
  document.getElementById('dialogContainerBackward').style.display = 'block';
});

//SKIP CONTAINER POPUP DIALOG
document.getElementById('closeBtnDialogForward').addEventListener('click', function() {
  document.getElementById('dialogContainerForward').style.display = 'none';
});

document.getElementById('closeBtnDialogBackward').addEventListener('click', function() {
  document.getElementById('dialogContainerBackward').style.display = 'none';
});

document.getElementById('okBtnForward').addEventListener('click', function() {
  fnSkipHostForward();
  document.getElementById('dialogContainerForward').style.display = 'none';
});

document.getElementById('okBtnBackward').addEventListener('click', function() {
  fnSkipHostBackward();
  document.getElementById('dialogContainerBackward').style.display = 'none';
});

document.getElementById('cancelBtnForward').addEventListener('click', function() {
  document.getElementById('dialogContainerForward').style.display = 'none';
});

document.getElementById('cancelBtnBackward').addEventListener('click', function() {
  document.getElementById('dialogContainerBackward').style.display = 'none';
});


//SETTINGS CONTAINER POPUP
document.getElementById('settings').addEventListener('click', function() {
  document.getElementById('settingsContainer').style.display = 'block';
});

document.getElementById('closeBtnSettings').addEventListener('click', function() {
  document.getElementById('settingsContainer').style.display = 'none';
});

document.getElementById('cancelBtnSettings').addEventListener('click', function() {
  document.getElementById('settingsContainer').style.display = 'none';
});

// INFO CONTAINER POPUP
document.getElementById('info').addEventListener('click', function() {
  document.getElementById('infoContainer').style.display = 'block';
});

document.getElementById('closeBtnInfo').addEventListener('click', function() {
  document.getElementById('infoContainer').style.display = 'none';
});

document.getElementById('cancelBtnInfo').addEventListener('click', function() {
  document.getElementById('infoContainer').style.display = 'none';
});

// TEAM CONTAINER POPUP
document.getElementById('team').addEventListener('click', function() {
  document.getElementById('teamContainer').style.display = 'block';
  populateTeamsList();
});

document.getElementById('closeBtnTeam').addEventListener('click', function() { 
  deleteElements();
  document.getElementById('teamContainer').style.display = 'none'; 
});

document.getElementById('cancelBtnTeam').addEventListener('click', function() {
  deleteElements();
  document.getElementById('teamContainer').style.display = 'none';
});

document.getElementById('addTeamMember').addEventListener('click', function() {
  document.getElementById('dialogAddTeamMember').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
});

document.getElementById('closeBtnAddTeamMember').addEventListener('click', function() { 
  document.getElementById('dialogAddTeamMember').style.display = 'none'; 
  document.getElementById('overlay').style.display = 'none';
});

document.getElementById('cancelBtnAddTeamMember').addEventListener('click', function() {
  document.getElementById('dialogAddTeamMember').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
});

document.getElementById('addBtnAddTeamMember').addEventListener('click', function() {
  addTeamMember()
  document.getElementById('dialogAddTeamMember').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
  updateList()
  document.querySelector('#label-text').innerHTML = "Team list has changed. Adjust Host position."
  document.querySelector('#label').innerHTML = ""
  
});

document.getElementById('closeBtnDeleteTeamMember').addEventListener('click', function() {
  document.getElementById('dialogDeleteTeamMember').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
})

