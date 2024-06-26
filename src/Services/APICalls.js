// STRAVA API Calls

export const getAccessToken = (userAuthToken) => {
  let clientID = `${import.meta.env.VITE_CLIENT_ID}`;
  let clientSecret = `${import.meta.env.VITE_CLIENT_SECRET}`;

  return fetch(`https://www.strava.com/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientID,
      client_secret: clientSecret,
      code: `${userAuthToken}`,
      grant_type: "authorization_code",
    }),
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error();
  });
};

// Not using this but may in down the road, works for
// fetching all user information
export const getAthleteDetails = (userAccessToken) => {
  return fetch("https://www.strava.com/api/v3/athlete", {
    headers: {
      Authorization: `Bearer ${userAccessToken}`,
    },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error();
  });
};

export const getUserActivities = (pageNum, userAccessToken) => {
  return fetch(
    `https://www.strava.com/api/v3/athlete/activities?page=${pageNum}&per_page=200`,
    {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    }
  ).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error();
  });
};

export const getUserGearDetails = (id, userAccessToken) => {
  return fetch(`https://www.strava.com/api/v3/gear/${id}`, {
    headers: {
      Authorization: `Bearer ${userAccessToken}`,
    },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error();
  });
};

// Heroku BE Database API Calls

// Must have `credentials: "include"` in header of
// all requests to maintain same Express session
// All req besides GET need to send the csrfToken
// in the cookie of the req

// CSRF added to BE 10.31.23

export const loadUserSuspensionFromDatabase = (userID) => {
  const dbUrl = import.meta.env.VITE_DB_URL;
  return fetch(`${dbUrl}/suspension/${userID}`, {
    method: "GET",
    credentials: "include",
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error();
  });
};

export const postUserSuspensionToDatabase = (newSus) => {
  const dbUrl = import.meta.env.VITE_DB_URL;
  return fetch(`${dbUrl}/suspension/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sus: newSus }),
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error();
  });
};

export const editUserSuspensionInDatabase = (susToEdit) => {
  const dbUrl = import.meta.env.VITE_DB_URL;
  return fetch(`${dbUrl}/suspension/${susToEdit.id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ sus: susToEdit }),
  }).then((response) => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error();
    }
  });
};

export const deleteUserSuspensionInDatabase = (susToDeleteId) => {
  const dbUrl = import.meta.env.VITE_DB_URL;
  return fetch(`${dbUrl}/suspension/${susToDeleteId}`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include"
  }).then((response) => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error();
    }
  });
};
