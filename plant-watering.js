const fs = require('node:fs');
const plantRules = require('./plants.json');

const datePattern = /day \d+\/\d+\/20\d\d/;
const logFilePath = '../log.txt';

const currentDate = new Date();
const currentDayName = currentDate.toLocaleString('en-us', { weekday: 'long' });
const currentMonth = currentDate.getMonth() + 1;
const currentDay = currentDate.getDate();
const currentYear = currentDate.getFullYear();
const currentDateString = `${currentDayName} ${currentMonth}/${currentDay}/${currentYear}`;

const getPastDays = (successCallback, errorCallback) => {
    fs.readFile(logFilePath, 'utf8', (error, logFileContents) => {
        if (error) {
            errorCallback(error);
        } else {
            const logFileLines = logFileContents.split("\n");
            const days = [];

            logFileLines.forEach(logFileLine => {
                if (datePattern.test(logFileLine)) {
                    days.push({
                        date: logFileLine,
                        activities: []
                    });
                } else if (logFileLine.startsWith("x ")) {
                    if (days[days.length - 1] && days[days.length - 1].activities) {
                        days[days.length - 1].activities.push(logFileLine);
                    } else {
                        errorCallback("Encountered a problem");
                    }
                }
            });

            const currentDayIndex = days.map(day => day.date).indexOf(currentDateString);
            const pastDays = days.slice(0, currentDayIndex);
            successCallback(pastDays);
        }
    });
};


getPastDays(pastDays => {
    const wateringDays = pastDays.filter(day => {
        return day.activities.some(activity => activity.startsWith("x Water "));
    });

    const wateringLogs = wateringDays.map(day => {
        const wateringActivityLine = day.activities.filter(activity => activity.startsWith("x Water"))[0];
        const wateredPlantsString = wateringActivityLine.slice(8, wateringActivityLine.length);
        const wateredPlants = wateredPlantsString.split(", ");

        return {
            date: day.date,
            wateredPlants
        };
    });

    const lastWatered = plantRules.plants.map(plant => {
        for (let i = wateringLogs.length - 1; i >= 0; i--) {
            if (wateringLogs[i].wateredPlants.includes(plant.name)) {
                return {
                    plantName: plant.name,
                    lastWatered: wateringLogs[i].date
                };
            }
        }
    });

    const plantsThatNeedToBeWatered = lastWatered.filter((plant, index) => {
        const lastWateringDateString = plant.lastWatered.split("day ")[1];
        const lastWateringDate = new Date(lastWateringDateString);
        const lastWateringUnixTimestamp = lastWateringDate.getTime();
        const millisecondsSinceLastWatering = currentDate.getTime() - lastWateringUnixTimestamp;
        const daysSinceLastWatering = Math.floor(millisecondsSinceLastWatering / (1000 * 60 * 60 * 24));
        return daysSinceLastWatering > plantRules.plants[index].maxDaysBetweenWatering;
    }).map(plant => plant.plantName);

    console.log("Plants that need to be watered: ");
    console.log(plantsThatNeedToBeWatered);

}, error => {
    console.log("An error was encountered");
});