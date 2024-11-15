import moment from 'moment';
import { suspensionData } from '../SuspensionData';
import { getUserActivities } from '../Services/APICalls';

export const testForDeniedPermission = (url) => url.split('&')[1] === 'error=access_denied';

export const stripURLForToken = (url) => {
  if (url) return url.split('&')[1].slice(5);
};

export const filterRideActivities = (activities) => activities.filter((act) => act.type === 'Ride');

export const cleanRideData = (rides) =>
  rides.map((ride) => ({
    id: ride.id,
    user_id: ride.athlete.id,
    ride_duration: ride.moving_time,
    ride_distance: ride.distance,
    ride_date: ride.start_date,
    gear_id: ride.gear_id,
  }));

export const getGearIDNumbers = (userRides) =>
  userRides.reduce((arr, ride) => {
    const gearID = ride.gear_id;
    if (gearID && !arr.includes(gearID)) {
      arr.push(gearID);
    }
    return arr;
  }, []);

const calculateRideTimeSinceLastRebuild = (rides, rebuildDate) =>
  rides.reduce((total, ride) => {
    if (moment(ride.ride_date).isAfter(rebuildDate) && ride?.ride_duration) {
      total += ride.ride_duration;
    }
    return total;
  }, 0);

export const calculateRebuildLife = (newSusDataId, rebuildDate, userRides, onBike, bikeOptions) => {
  const suspension = suspensionData.find((sus) => sus.id === +newSusDataId);
  const susBike = bikeOptions.find((bike) => bike.id === onBike);
  const ridesOnBike = filterRidesForSpecificBike(userRides, susBike);
  const rideTimeSinceLastRebuild = calculateRideTimeSinceLastRebuild(ridesOnBike, rebuildDate);

  const hoursSinceLastRebuild = rideTimeSinceLastRebuild / 3600;
  const percentRebuildLifeRemaining = parseFloat(
    (1 - hoursSinceLastRebuild / suspension.rebuildInt).toFixed(6),
  );

  return percentRebuildLifeRemaining;
};

export const isOldestRideBeforeRebuild = (rides, rebuildDate) => {
  if (!rides) return;
  let today = moment().format();
  const oldestRideDate = rides.reduce((oldest, ride) => {
    if (moment(ride.ride_date).isBefore(oldest)) {
      oldest = ride.ride_date;
    }
    return oldest;
  }, today);
  return moment(oldestRideDate).isAfter(rebuildDate);
};

export const findSusIndexByID = (id, susOptions) => susOptions.findIndex((sus) => sus.id === id);

const findSusInfoById = (sus) => suspensionData.find((susData) => sus.sus_data_id === susData.id);

const findBikeDetailsById = (sus, bikeOptions) => {
  const bikeResult = bikeOptions?.find((bike) => bike.id === sus.on_bike_id);

  return bikeResult
    ? bikeResult
    : {
        id: 'unknownBike',
        brand_name: 'Unknown',
        model_name: 'Bike',
      };
};

export const convertSuspensionFromDatabase = (sus, bikeOptions) => {
  const foundBike = findBikeDetailsById(sus, bikeOptions);
  const foundSusInfo = findSusInfoById(sus);

  return {
    id: sus.id,
    onBike: foundBike,
    rebuildDate: sus.rebuild_date,
    rebuildLife: sus.rebuild_life,
    susData: foundSusInfo,
    dateCreated: sus.date_created,
    lastRideCalculated: sus.last_ride_calculated,
  };
};

export const convertSusToDatabaseFormat = (sus, userID) => ({
  id: sus.id,
  user_id: userID,
  rebuild_life: sus.rebuildLife,
  rebuild_date: sus.rebuildDate,
  sus_data_id: sus.susData.id,
  on_bike_id: sus.onBike.id,
  date_created: new Date(),
  last_ride_calculated: sus.lastRideCalculated,
});

export const isNewestRideAfterLastCalculated = (userRides, sus) => {
  const lastRideCalculatedDate = sus.lastRideCalculated;
  const newestRideOnBikeDate = filterRidesForSpecificBike(userRides, sus.onBike)[0].ride_date;

  return moment(newestRideOnBikeDate).isAfter(lastRideCalculatedDate);
};

export const filterRidesForSpecificBike = (userRides, onBike) => {
  if (onBike?.id && onBike.id !== 'unknownBike') {
    return userRides.filter((ride) => ride.gear_id === onBike.id);
  }
  return userRides;
};

export const formatBikeDetails = (fetchedGearDetails) =>
  fetchedGearDetails.map((detail) => {
    const { id, name, brand_name, model_name, frame_type } = detail;
    return {
      id,
      name,
      brand_name: brand_name != null ? brand_name : '',
      model_name: model_name != null ? model_name : name,
      frame_type: generateBikeTypeString(frame_type),
    };
  });

export const generateBikeTypeString = (frameTypeIdFromStrava) => {
  switch (frameTypeIdFromStrava) {
    case 1:
      return 'Mountain Bike';
    case 2:
      return 'Cross Bike';
    case 3:
      return 'Road Bike';
    case 4:
      return 'TT Bike';
    case 5:
      return 'Gravel Bike';
    default:
      return 'Unknown Bike Type';
  }
};

export const sortUserSuspensionByBikeId = (susArr) => {
  const sortedSusArr = susArr.toSorted((a, b) => {
    if (a.onBike.id < b.onBike.id) {
      return -1;
    } else if (a.onBike.id > b.onBike.id) {
      return 1;
    }
    return 0;
  });
  return sortedSusArr;
};

export const fetchMoreRidesIfNeeded = async (
  userAccessToken,
  rebuildDate,
  userRideState,
  pagesFetchedState,
) => {
  let fetchedRides = [];
  let currentPagesFetched = pagesFetchedState;

  try {
    while (currentPagesFetched <= 5) {
      const fetchMoreRides = isOldestRideBeforeRebuild([...userRideState, ...fetchedRides], rebuildDate);
      if (!fetchMoreRides) {
        const result = {
          newUserRides: [...userRideState, ...fetchedRides],
          newPagesFetched: currentPagesFetched,
        };
        return result;
      }

      console.log(`Fetching page ${currentPagesFetched + 1} athlete activities`);
      const activities = await getUserActivities(currentPagesFetched + 1, userAccessToken);
      const rideActivities = filterRideActivities(activities);
      const cleanedRides = cleanRideData(rideActivities);

      if (cleanedRides) {
        fetchedRides.push(...cleanedRides);
        currentPagesFetched += 1;
      }
    }
    throw new Error('Maximum activities fetched');
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const isDateWithin20Years = (rebuildDate) => {
  const oldestAllowed = moment().subtract(20, 'years').format();
  return moment(rebuildDate).isAfter(oldestAllowed);
};
