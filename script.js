// Global variable of maplist
let mapList;
let provinceArr = []

async function loadMap() {
  let map = document.getElementById("map").contentDocument.querySelector("svg");
  let toolTip = document.getElementById("toolTip");
  let mapInfo = document.querySelector(".map-info-wrapper")
  let visaInfo_Wrapper = document.getElementById("visaInfo_Wrapper")
  let visaInfo_VisaFree = document.getElementById("visaInfo_VisaFree")
  let visaInfo_144 = document.getElementById("visaInfo_144")
  let visaInfo_72 = document.getElementById("visaInfo_72")
  // let travelScopeText = document.getElementById("travel-scope")
  // let portsText = document.getElementById("port")
  // const nationality = document.getElementById("nationality-input").value
  const nationality = "Belgium";
  const visaPolicies = await getVisaPolicies()
  


  // Add event listeners to map element
  if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    // If user agent is not mobile add click listener (for wikidata links)
    map.addEventListener("click", handleClick, false);
  }
  map.addEventListener("mousemove", mouseEntered, false);
  map.addEventListener("mouseout", mouseGone, false);

  // Show tooltip on mousemove
  function mouseEntered(e) {
    let target = e.target;
    if (target.nodeName == "path") {
      target.style.opacity = 0.6;
      const details = e.target.attributes;
      const province = details.name.value

    
      // Follow cursor
      toolTip.style.transform = `translate(${e.offsetX}px, ${e.offsetY}px)`;

      // Tooltip data
      toolTip.innerHTML = `
        <ul>
            <li><b>Province: ${details.name.value}</b></li>
            <li>Local name: ${details.gn_name.value}</li>
            <li>Country: ${details.admin.value}</li>
            <li>Postal: ${details.postal.value}</li>
        </ul>`;

      // Returns an object containing all aligieble policies given nationality
      const policies = visaPolicyChecker(nationality, province, visaPolicies)  

      // Updates the page on travel scope and port of entry/exit
      updateMapInfo(policies, province, mapInfo)

      updateVisaInfo(policies)

      highlightScope(map, policies)
      console.log(provinceArr)

      // let a = map.querySelector(`path[name="Gansu"]`)
      // a.style.fill = "blue"

    }
  }

  // Clear tooltip on mouseout
  function mouseGone(e) {
    let target = e.target;
    if (target.nodeName == "path") {
      target.style.opacity = 1;
      toolTip.innerHTML = "";
      
      mapInfo.innerHTML = `
        <h2>Please enter your province of entry or hover over a province to begin</h2>
      `

      visaInfo_Wrapper.innerHTML = `
      <div id="visaInfo_VisaFree" class="visa-drop-down visa-free" ></div>
          <div id="visaInfo_144" class="visa-drop-down 144" ></div>
          <div id="visaInfo_72" class="visa-drop-down 72" ></div>
          `


      provinceArr.forEach(province => {
        if (province) {
          province.style.fill = "";
        } else {
          console.error(`Province not found in the SVG.`);
        }
      })

      provinceArr.length = 0
      

    } 
    
  }

  // Go to wikidata page onclick
  function handleClick(e) {
    if (e.target.nodeName == "path") {
      const details = e.target.attributes;
      window.open(`https://www.wikidata.org/wiki/${details.wikidataid.value}`, "_blank");
    }
  }
}

// Calls init function on window load
window.onload = function () {
  let changeSelector = document.getElementById("mapChange");

  // Get JSON file containing map list
  getData("mapList.json").then(function (res) {
    mapList = res;
    res.map(function (item) {
      let option = document.createElement("option");
      option.text = item[0] + " - " + item[1];
      option.value = item[3];
      changeSelector.appendChild(option);
    });
    changeSelector.options[149].selected = "selected";
  });

  // Init map
  loadMap();
};

/* 
Checks visa policies aligible given:
country of origin
province of entry
visaPolicy json file
*/
function visaPolicyChecker(country, province, visaPolicies) {
  let results = {}
  let highestPriority = Infinity;

  //   policyName: "",
  //   priority: 0,
  //   duration: 0,
  //   requirements: [],
  //   specialConditions: [],
  //   region: "",
  //   cities: [],
  //   eligiblePorts: [],
  //   scopeOfPermittedTravel: ""
  // }

    // Loop through individual policies
    visaPolicies.individualPolicies.forEach(policy => {
      // Check if the country is eligible or if it's a global policy
      if (policy.eligibleCountries.includes(country) || policy.eligibleCountries === "All") {
        // Check for regionalPorts in the policy
        if (policy.regionalPorts) {
          policy.regionalPorts.forEach(region => {
            // Match the province
            if (region.region.toLowerCase().includes(province.toLowerCase())) {
              if (policy.priority < highestPriority) {
                highestPriority = policy.priority;
                results = {
                  policyName: policy.name,
                  priority: policy.priority,
                  duration: policy.duration,
                  requirements: policy.requirements,
                  specialConditions: policy.specialConditions,
                  region: region.region,
                  cities: region.cities,
                  eligiblePorts: region.eligiblePorts,
                  scopeOfPermittedTravel: region.scopeOfPermittedTravel
                };
              }
              
              
            }
          });
        } else {
          if (policy.priority < highestPriority) {
            highestPriority = policy.priority;
            results = {
              policyName: policy.name,
              priority: policy.priority,
              duration: policy.duration,
              requirements: policy.requirements,
              specialConditions: policy.specialConditions,
              region: "",
              cities: [],
              eligiblePorts: [],
              scopeOfPermittedTravel: {}
            }
          } 
        }

      }
    });
    return Object.keys(results).length > 0 ? results : null;
  }

function updateMapInfo(policies, province, mapInfo) {
  if (isNaN(policies)) {
    mapInfo.innerHTML = `
            <h2>Hover over a province or enter a nationality to begin</h2>
          `
  }

  if (!policies.region) {
    if (policies.priority === 1) {
      mapInfo.innerHTML = `
            <div id="travel-scope" class="map-info" ><h2>Travel Scope</h2>
              <p>You are entering China from ${province}.</p>
              <p>You have a priority-1 nationality, you can travel anywhere as long as you meet the requirements!</p>
            </div>
            
            <div id="port" class="map-info" >
              <h2>Port of entry/exit</h2>
              <p>You may exit China through any ports!</p>
            </div>
          `

      
    } else if (policies === 4){
      mapInfo.innerHTML = `
            <h1>You have a priority-4 visa, you must remain in the transit area of the airport!</h1>
          `
    } else if (policies.priority){
      mapInfo.innerHTML = `
            <h1>Sorry, with your current visa, you may not leave the airport during transit in this province.</h1>
          `
    }
  } else {
    mapInfo.innerHTML = `
      <div id="travel-scope" class="map-info" ><h2>Travel Scope</h2>
        <p>You are entering China from ${province}.</p>
        <p>Therefore, you are allowed to travel in the highlighted area on the map, they are: ${policies.scopeOfPermittedTravel.scope}.</p>
      </div>
      
      <div id="port" class="map-info" >
        <h2>Port of entry/exit</h2>
        <p>You may exit China through these ports: ${policies.eligiblePorts.join(', ')}</p>
      </div>
    `
  }
  
}

function updateVisaInfo(policies) {
  if (policies.priority === 1) {
    visaInfo_VisaFree.innerHTML = `
      <h1>You are eligible for the ${policies.policyName}!</h1>
      <h3>You can stay for ${policies.duration} hours in one stay.</h3>
      <h3>Requirements to take note of: </h3>
      <p>${policies.requirements.join(', ')}</p>
      <p><b>Special conditions:</b>${policies.specialConditions.join(', ')}</p>
    `
  } else if (policies.priority === 2) {
    visaInfo_144.innerHTML = `
      <h1>You are eligible for the ${policies.policyName}!</h1>
      <h3>You can stay for ${policies.duration} hours in one stay.</h3>
      <h3>Requirements to take note of: </h3>
      <p>${policies.requirements.join(', ')}</p>
      <p><b>Special conditions:</b>${policies.specialConditions.join(', ')}</p>
    `
  } else {
    visaInfo_72.innerHTML = `
      <h1>You are eligible for the ${policies.policyName}!</h1>
      <h3>You can stay for ${policies.duration} hours in one stay.</h3>
      <h3>Requirements to take note of: </h3>
      <p>${policies.requirements.join(', ')}</p>
      <p><b>Special conditions:</b>${policies.specialConditions.join(', ')}</p>
    `
  }

}

function highlightScope(map, policies, provinceArr) {
  console.log("highlightScope called");

  // Add provinces to the global array and highlight them
  policies.scopeOfPermittedTravel.provinces.forEach(provinceName => {
    let province = map.querySelector(`path[name="${provinceName}"]`);
    if (province) {
      province.style.fill = "blue"; // Apply the highlight
      provinceArr.push(province); // Add the province to the global array
    } else {
      console.error(`Province ${provinceName} not found in the SVG.`);
    }
    
  });
  console.log("provinceArr is: ", provinceArr)
  
}

function randomMap() {
  var random = Math.floor(Math.random() * mapList.length);
  changeMap(random);
}

// Calls map change function on button click
function changeMap(random) {
  var map = document.getElementById("map");
  var changeSelector = document.getElementById("mapChange");
  var downloadLink = document.querySelector("a.download");
  var countryName = document.getElementById("country-name");

  // Get value of dropdown selection
  var selectedValue;

  if (random) {
    // Random map generated
    selectedValue = mapList[random][3];
    changeSelector.options[random].selected = "selected";
  } else {
    // Selected from dropdown
    selectedValue = changeSelector.options[changeSelector.selectedIndex].value;
  }

  // Get details of selected country
  var details = mapList.filter(function (item) {
    return item[3] == selectedValue;
  });

  // Set country title
  countryName.innerHTML = details[0][2];

  // Load new map
  map.data = `maps/${selectedValue}`;
  downloadLink.href = `maps/${selectedValue}`;

  // Re-init map on map load
  map.onload = function () {
    loadMap();
  };
}

// Getting visaPolices
async function getVisaPolicies() {
  try {
    // Replace 'visaPolicy.json' with the actual path to your JSON file
    const response = await fetch("visaPolicy.json");
    
    // Ensure the request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Parse the JSON data
    const visaPolicies = await response.json();
    return visaPolicies;
  } catch (error) {
    console.error("Failed to fetch visa policies:", error);
  }
}


// Load external data
function getData(e) {
  var request = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    request.open("GET", e);

    request.onload = function () {
      if (request.status >= 200 && request.status < 400) {
        resolve(JSON.parse(request.responseText));
      } else {
        console.error("Cant reach the file!");
      }
    };

    request.onerror = function () {
      console.error("Cant reach the file!");
    };

    request.send();
  });
}
