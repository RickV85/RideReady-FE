import { useEffect, useRef, useState } from "react";
import "./EditSus.css";
import { useNavigate } from "react-router-dom";
import { convertSusToDatabaseFormat, findSusIndexByID } from "../../util";
import moment from "moment";
import {
  calculateRebuildLife,
  isOldestRideBeforeRebuild,
  filterRideActivities,
  cleanRideData,
  filterRidesForSpecificBike,
  convertSuspensionFromDatabase,
} from "../../util";
import {
  editUserSuspensionInDatabase,
  getUserActivities,
  loadUserSuspensionFromDatabase,
} from "../../Services/APICalls";
import PropTypes from "prop-types";

export default function EditSus({
  setUserSuspension,
  userSuspension,
  setSelectedSuspension,
  selectedSuspension,
  userAccessToken,
  setUserAccessToken,
  userRides,
  setUserRides,
  pagesFetched,
  setPagesFetched,
  userBikes,
  setUserBikes,
  changeErrorMessage,
  userID,
  setUserID,
}) {
  const [newRebuildDate, setNewRebuildDate] = useState("");
  const [editSusIndex, setEditSusIndex] = useState(null);
  const [editSusDetails, setEditSusDetails] = useState(null);
  const fetchPageNum = useRef(pagesFetched);
  const lastLoadedPageNum = useRef(pagesFetched);
  const [loadingRides, setLoadingRides] = useState(false);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  const navigate = useNavigate();
  const editSusErrorModal = document.getElementById("editSusErrorModal");

  useEffect(() => {
    if (!userBikes) {
      const loadedBikes = JSON.parse(localStorage.getItem("userBikes"));
      setUserBikes(loadedBikes);
    }
    if (!userRides) {
      const loadedRides = JSON.parse(localStorage.getItem("userRides"));
      setUserRides(loadedRides);
    }
    if (!userAccessToken) {
      const loadedToken = JSON.parse(localStorage.getItem("userAccessToken"));
      setUserAccessToken(loadedToken);
    }
    if (!selectedSuspension) {
      const loadedSelection = JSON.parse(
        localStorage.getItem("selectedSuspension")
      );
      if (loadedSelection === null) {
        navigate("/dashboard");
      } else {
        setSelectedSuspension(loadedSelection);
      }
    }
    if (!userID) {
      const loadedID = JSON.parse(localStorage.getItem("userID"));
      setUserID(loadedID);
    }
    if (!userSuspension && userID && userBikes) {
      loadUserSuspensionFromDatabase(userID)
        .then((result) => {
          if (result.suspension && result.suspension.length > 0) {
            const convertedDBSus = result.suspension.map((sus) =>
              convertSuspensionFromDatabase(sus, userBikes)
            );
            console.log(`User suspension loaded from DB`, convertedDBSus);
            setUserSuspension(convertedDBSus);
          } else {
            console.log(`No suspension loaded from DB for userID: ${userID}`);
            setUserSuspension([]);
          }
        })
        .catch((error) => {
          console.log(error);
          setErrorModalMessage(
            `There was an error loading your suspension from the database. Please try reloading the page by clicking the button below.`
          );
          editSusErrorModal.showModal();
          setTimeout(() => {
            editSusErrorModal.close();
          }, 10000);
        });
    }
    // eslint-disable-next-line
  }, [
    userBikes,
    userRides,
    userAccessToken,
    selectedSuspension,
    userID,
    userSuspension,
  ]);

  useEffect(() => {
    if (!selectedSuspension || !userSuspension) return;
    const index = findSusIndexByID(selectedSuspension, userSuspension);
    setEditSusIndex(index);
    setEditSusDetails(userSuspension[index]);
  }, [selectedSuspension, userSuspension]);

  useEffect(() => {
    let moreRidesNeeded;
    if (newRebuildDate) {
      moreRidesNeeded = isOldestRideBeforeRebuild(userRides, newRebuildDate);
    }
    if (moreRidesNeeded) {
      if (
        lastLoadedPageNum.current !== fetchPageNum.current ||
        lastLoadedPageNum.current > 10
      )
        return;
      setLoadingRides(true);
      setSubmitDisabled(true);
      fetchPageNum.current += 1;
      getUserActivities(fetchPageNum.current, userAccessToken)
        .then((activities) => {
          const rideActivities = filterRideActivities(activities);
          const cleanedRides = cleanRideData(rideActivities);
          if (cleanedRides) {
            setUserRides([...userRides, ...cleanedRides]);
            window.localStorage.setItem(
              "userRides",
              JSON.stringify([...userRides, ...cleanedRides])
            );
          }
          lastLoadedPageNum.current += 1;
          setLoadingRides(false);
          setSubmitDisabled(false);
        })
        .catch(() => {
          changeErrorMessage(`An error occurred while fetching your rides. 
      Please return to the home page and try logging in again.`);
        });
    }
    // eslint-disable-next-line
  }, [newRebuildDate, userRides]);

  const handleSubmit = () => {
    if (!newRebuildDate) {
      setSubmitError(true);
      setTimeout(() => setSubmitError(false), 3000);
      return;
    }

    const modifiedSus = JSON.parse(JSON.stringify(editSusDetails));
    modifiedSus.rebuildDate = newRebuildDate;
    modifiedSus.rebuildLife = calculateRebuildLife(
      modifiedSus.susData.id,
      newRebuildDate,
      userRides,
      modifiedSus.onBike.id,
      userBikes
    );
    const newestRideOnBikeDate = filterRidesForSpecificBike(
      userRides,
      modifiedSus.onBike
    )[0].ride_date;
    modifiedSus.lastRideCalculated = newestRideOnBikeDate;

    const susDataConvertedForDatabase = convertSusToDatabaseFormat(modifiedSus);

    editUserSuspensionInDatabase(susDataConvertedForDatabase)
      .then((result) => {
        console.log(result);
        let newUserSusArr = JSON.parse(JSON.stringify(userSuspension, userID));
        newUserSusArr.splice(editSusIndex, 1, modifiedSus);
        setUserSuspension(newUserSusArr);

        window.localStorage.setItem("selectedSuspension", JSON.stringify(null));
        setSelectedSuspension(null);
        setPagesFetched(lastLoadedPageNum.current);
      })
      .catch((error) => {
        console.log(error);
        setErrorModalMessage(
          `There was an issue modifying your suspension rebuild date. Please try reloading the page by clicking the button below and try your request again.`
        );
        editSusErrorModal.showModal();
        setTimeout(() => {
          editSusErrorModal.close();
        }, 10000);
      });
  };

  return (
    <section className="edit-part-form-section">
      <h1
        id="edit-sus-site-logo"
        className="site-logo"
        onClick={() => {
          window.localStorage.setItem(
            "selectedSuspension",
            JSON.stringify(null)
          );
          setSelectedSuspension(null);
        }}
      >
        Ride Ready
      </h1>
      <div className="edit-sus-details">
        {editSusDetails && (
          <h2>{`Change rebuild date of the ${editSusDetails.susData.name}
          on your ${editSusDetails.onBike.brand_name} ${editSusDetails.onBike.model_name}`}</h2>
        )}
        {editSusDetails && (
          <h2>{`Currently: ${moment(editSusDetails.rebuildDate).format(
            "ll"
          )}`}</h2>
        )}
        <form>
          <input
            type="date"
            value={newRebuildDate}
            max={new Date().toLocaleDateString("fr-ca")}
            onChange={(event) => setNewRebuildDate(event.target.value)}
          />
        </form>
        <div className="edit-section-buttons">
          <button
            onClick={() => {
              window.localStorage.setItem(
                "selectedSuspension",
                JSON.stringify(null)
              );
              setSelectedSuspension(null);
            }}
          >
            Back
          </button>
          <button onClick={() => handleSubmit()} disabled={submitDisabled}>
            Submit
          </button>
        </div>
        {submitError && (
          <p className="error-wait-message">
            Please fill out all forms before submitting
          </p>
        )}
        {loadingRides && (
          <p className="error-wait-message">
            Please wait for data to load.
            <br />
            This could take up to 15 seconds
          </p>
        )}
      </div>
      <div className="edit-spacer"></div>
      <dialog id="editSusErrorModal">
        {errorModalMessage}
        <button id="reloadButton" onClick={() => window.location.reload()}>
          Reload
        </button>
      </dialog>
    </section>
  );
}

EditSus.propTypes = {
  setUserSuspension: PropTypes.func,
  userSuspension: PropTypes.array,
  setSelectedSuspension: PropTypes.func,
  selectedSuspension: PropTypes.string,
  userAccessToken: PropTypes.string,
  setUserAccessToken: PropTypes.func,
  userRides: PropTypes.array,
  setUserRides: PropTypes.func,
  pagesFetched: PropTypes.number,
  setPagesFetched: PropTypes.func,
  userBikes: PropTypes.array,
  setUserBikes: PropTypes.func,
  changeErrorMessage: PropTypes.func,
  userID: PropTypes.number,
  setUserID: PropTypes.func,
};
