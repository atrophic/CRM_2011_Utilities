/// <reference path="new_common.js" />
///<reference path="IntelliSense\XrmPage-vsdoc.js"/>

function wireUpCountryAndStateFields(countryFieldName, stateFieldName) {
    /// <summary>Turns a pair of country and stateOrProvince controls into dependent dropdown lists.</summary>
    /// <param name="countryFieldName" type="String">Name of the Country field to change. 'country' or 'address1_country' are typical.</param>
    /// <param name="stateFieldName" type="String">Name of the StateOrProvice field to change. 'stateorprovince' or 'address1_stateorprovince' are typical.</param>
    wireUpCountryField(countryFieldName, stateFieldName);
}

function wireUpCountryField(countryFieldName, stateFieldName) {
    /// <summary>Configures the country field to be a dropdown based on the Country object.</summary>
    /// <param name="countryFieldName" type="String">Name of the Country field to change. 'country' or 'address1_country' are typical.</param>
    /// <param name="stateFieldName" type="String">Name of the StateOrProvice field whose values depend on this country field. 'stateorprovince' or 'address1_stateorprovince' are typical.</param>
    var $countryField = $('#' + countryFieldName);
    if ($countryField.length < 1) return;

    // hide the existing textbox
    $countryField.hide();

    var selectedCountry = $countryField.val();
    var countryRequirementLevel = Xrm.Page.getAttribute(countryFieldName).getRequiredLevel();
    countryRequirementLevel = countryRequirementLevel == "required" ? 2 : countryRequirementLevel == "recommended" ? 1 : 0;

    var $countryDropdown = generateSelectBox('ddl_' + countryFieldName, countryRequirementLevel, Countries, selectedCountry);

    // add the generated dropdown to the cell where the textbox was
    $('#' + countryFieldName + '_d').append($countryDropdown);
    // bind a function to the change event on the dropdown so we can populate the real field's value
    $countryDropdown.change({ 'countryFieldName': countryFieldName, 'stateFieldName': stateFieldName }, handleCountryChanged);

    // wire up the state field based on the currently selected country
    wireUpStateField(stateFieldName, selectedCountry);
}

function wireUpStateField(stateFieldName, selectedCountry) {
    /// <summary>Configures the stateOrProvince field to be a dropdown dependent on the value of the country dropdown. Values are pulled from the Countries object.</summary>
    /// <param name="stateFieldName" type="String">Name of the StateOrProvice field to change. 'stateorprovince' or 'address1_stateorprovince' are typical.</param>
    /// <param name="selectedCountry" type="String">Name of the selected country, which is used to determine which states should be shown.</param>
    var stateAttr = Xrm.Page.getAttribute(stateFieldName);
    var selectedState = stateAttr == null ? "" : stateAttr.getValue();

    var states = getStatesForCountry(selectedCountry);
    var $stateField = $('#' + stateFieldName);

    // if states aren't known, leave the textbox around
    if (states == null || !$.isArray(states) || states.length < 1) {
        $('#ddl_' + stateFieldName).remove();
        $stateField.show();
        return;
    }

    // we have values for a dropdown, so hide the textbox field
    $stateField.hide();

    var stateRequirementLevel = Xrm.Page.getAttribute(stateFieldName).getRequiredLevel();
    stateRequirementLevel = stateRequirementLevel == "required" ? 2 : stateRequirementLevel == "recommended" ? 1 : 0;

    var $stateDropdown = generateSelectBox('ddl_' + stateFieldName, stateRequirementLevel, states, selectedState);

    // if there isn't a dropdown already, create it
    // otherwise, replace it so that the controls won't flash in the browser
    var $existingDropdown = $('#ddl_' + stateFieldName);
    if ($existingDropdown.length < 1)
        $('#' + stateFieldName + '_d').append($stateDropdown);
    else
        $existingDropdown.replaceWith($stateDropdown);

    // bind a function to the change event on the dropdown so we can populate the real field's value
    $stateDropdown.change({ 'stateFieldName': stateFieldName }, handleStateChanged);

    // fire the change event in case the existing value of the field is not available in the new dropdown values
    $stateDropdown.change();
}

function getStatesForCountry(selectedCountry) {
    /// <summary>Finds the states that go with selectedCountry, using the Countries object.</summary>
    /// <param name="selectedCountry" type="String">The name (not abbr) of the country that is selected.</param>
    /// <returns type="Array">Returns an array of states/provinces belonging to the selected country, or an empty array if they have not been configured.</returns>
    for (i in Countries) {
        var country = Countries[i];
        if (selectedCountry == country.name)
            return country.states;
    }

    return [];
}

function handleCountryChanged(eventData) {
    /// <summary>Sets the value of the country field to the newly selected value and reconfigures the dependent state dropdown.</summary>
    /// <param name="eventData" type="Object">jQuery handles this parameter, which contains the names of the fields that should be acted upon.</param>
    var stateFieldName = eventData.data.stateFieldName;
    var selectedCountry = setFieldFromDropdown(eventData.data.countryFieldName);

    wireUpStateField(stateFieldName, selectedCountry);
}

function handleStateChanged(eventData) {
    /// <summary>Sets the value of the stateOrProvince field to the newly selected value.</summary>
    /// <param name="eventData" type="Object">jQuery handles this parameter, which contains the names of the fields that should be acted upon.</param>
    setFieldFromDropdown(eventData.data.stateFieldName);
}

function setFieldFromDropdown(fieldName) {
    /// <summary>Sets a field's value based on a related dropdown's value.</summary>
    /// <param name="fieldName" type="String">Name of the field to set. The dropdown to get the value from is assumed to be this parameter prefixed with 'ddl_'.</param>
    /// <returns type="String">The value that was selected in the dropdown.</returns>
    var $dropdown = $('#ddl_' + fieldName);
    if ($dropdown.length != 1) return null;

    var selectedValue = $dropdown.find('option:selected:first').val();

    var attr = Xrm.Page.getAttribute(fieldName);
    if (attr != null) attr.setValue(selectedValue);

    return selectedValue;
}

function generateSelectBox(id, requirementLevel, options, selectedValue) {
    /// <summary>Generates a new select box with appropriate attributes for MS CRM 2011.</summary>
    /// <param name="id" type="String">Unique ID the new select element will have.</param>
    /// <param name="requirementLevel" type="Integer">Requirement level for the field, which will be set on the select element's attributes and used by CRM. 0 for 'none', 1 for 'recommended', 2 for 'required'.</param>
    /// <param name="options" type="Array">An array of the options, each one following this format: { "name": "Display value for dropdown", "abbr": "Value that isn't actually stored in the field but could easily be changed to be, if you want it to" }.</param>
    /// <param name="selectedValue" type="String">If an option is found whose 'name' property matches this string, it will be selected in the dropdown.</param>
    var $ddl = $('<select id="' + id + '" class="ms-crm-SelectBox" req="' + requirementLevel + '" height="4" style="IME-MODE: auto; width: 100%"></select>');

    $ddl.append(jQuery('<option></option').val('').html(''));
    $.each(options, function (i, item) {
        $ddl.append(jQuery('<option></option').val(item.name).html(item.name));
        if (selectedValue == item.name)
            $ddl.find('option:last').attr('selected', 'selected');
    });

    return $ddl;
}




// Global array of countries and their respective states
var Countries = [
                    { "name": "United States", "abbr": "US", "states": [{ "name": "Alabama", "abbr": "AL" },
                                                                        { "name": "Alaska", "abbr": "AK" },
                                                                        { "name": "American Samoa", "abbr": "AS" },
                                                                        { "name": "Arizona", "abbr": "AZ" },
                                                                        { "name": "Arkansas", "abbr": "AR" },
                                                                        { "name": "Armed Forces Americas", "abbr": "AA" },
                                                                        { "name": "Armed Forces Elsewhere", "abbr": "AE" },
                                                                        { "name": "Armed Forces Pacific", "abbr": "AP" },
                                                                        { "name": "California", "abbr": "CA" },
                                                                        { "name": "Colorado", "abbr": "CO" },
                                                                        { "name": "Connecticut", "abbr": "CT" },
                                                                        { "name": "Delaware", "abbr": "DE" },
                                                                        { "name": "District Of Columbia", "abbr": "DC" },
                                                                        { "name": "Federated States Of Micronesia", "abbr": "FM" },
                                                                        { "name": "Florida", "abbr": "FL" },
                                                                        { "name": "Georgia", "abbr": "GA" },
                                                                        { "name": "Guam", "abbr": "GU" },
                                                                        { "name": "Hawaii", "abbr": "HI" },
                                                                        { "name": "Idaho", "abbr": "ID" },
                                                                        { "name": "Illinois", "abbr": "IL" },
                                                                        { "name": "Indiana", "abbr": "IN" },
                                                                        { "name": "Iowa", "abbr": "IA" },
                                                                        { "name": "Kansas", "abbr": "KS" },
                                                                        { "name": "Kentucky", "abbr": "KY" },
                                                                        { "name": "Louisiana", "abbr": "LA" },
                                                                        { "name": "Maine", "abbr": "ME" },
                                                                        { "name": "Marshall Islands", "abbr": "MH" },
                                                                        { "name": "Maryland", "abbr": "MD" },
                                                                        { "name": "Massachusetts", "abbr": "MA" },
                                                                        { "name": "Michigan", "abbr": "MI" },
                                                                        { "name": "Minnesota", "abbr": "MN" },
                                                                        { "name": "Mississippi", "abbr": "MS" },
                                                                        { "name": "Missouri", "abbr": "MO" },
                                                                        { "name": "Montana", "abbr": "MT" },
                                                                        { "name": "Nebraska", "abbr": "NE" },
                                                                        { "name": "Nevada", "abbr": "NV" },
                                                                        { "name": "New Hampshire", "abbr": "NH" },
                                                                        { "name": "New Jersey", "abbr": "NJ" },
                                                                        { "name": "New Mexico", "abbr": "NM" },
                                                                        { "name": "New York", "abbr": "NY" },
                                                                        { "name": "North Carolina", "abbr": "NC" },
                                                                        { "name": "North Dakota", "abbr": "ND" },
                                                                        { "name": "Northern Mariana Islands", "abbr": "MP" },
                                                                        { "name": "Ohio", "abbr": "OH" },
                                                                        { "name": "Oklahoma", "abbr": "OK" },
                                                                        { "name": "Oregon", "abbr": "OR" },
                                                                        { "name": "Palau", "abbr": "PW" },
                                                                        { "name": "Pennsylvania", "abbr": "PA" },
                                                                        { "name": "Puerto Rico", "abbr": "PR" },
                                                                        { "name": "Rhode Island", "abbr": "RI" },
                                                                        { "name": "South Carolina", "abbr": "SC" },
                                                                        { "name": "South Dakota", "abbr": "SD" },
                                                                        { "name": "Tennessee", "abbr": "TN" },
                                                                        { "name": "Texas", "abbr": "TX" },
                                                                        { "name": "Utah", "abbr": "UT" },
                                                                        { "name": "Vermont", "abbr": "VT" },
                                                                        { "name": "Virgin Islands", "abbr": "VI" },
                                                                        { "name": "Virginia", "abbr": "VA" },
                                                                        { "name": "Washington", "abbr": "WA" },
                                                                        { "name": "West Virginia", "abbr": "WV" },
                                                                        { "name": "Wisconsin", "abbr": "WI" },
                                                                        { "name": "Wyoming", "abbr": "WY"}]
                    },
                    { "name": "Afghanistan", "abbr": "AF", "states": [] },
                    { "name": "Aland Islands", "abbr": "AX", "states": [] },
                    { "name": "Albania", "abbr": "AL", "states": [] },
                    { "name": "Algeria", "abbr": "DZ", "states": [] },
                    { "name": "American Samoa", "abbr": "AS", "states": [] },
                    { "name": "Andorra", "abbr": "AD", "states": [] },
                    { "name": "Angola", "abbr": "AO", "states": [] },
                    { "name": "Anguilla", "abbr": "AI", "states": [] },
                    { "name": "Antarctica", "abbr": "AQ", "states": [] },
                    { "name": "Antigua And Barbuda", "abbr": "AG", "states": [] },
                    { "name": "Argentina", "abbr": "AR", "states": [] },
                    { "name": "Armenia", "abbr": "AM", "states": [] },
                    { "name": "Aruba", "abbr": "AW", "states": [] },
                    { "name": "Australia", "abbr": "AU", "states": [] },
                    { "name": "Austria", "abbr": "AT", "states": [] },
                    { "name": "Azerbaijan", "abbr": "AZ", "states": [] },
                    { "name": "Bahamas", "abbr": "BS", "states": [] },
                    { "name": "Bahrain", "abbr": "BH", "states": [] },
                    { "name": "Bangladesh", "abbr": "BD", "states": [] },
                    { "name": "Barbados", "abbr": "BB", "states": [] },
                    { "name": "Belarus", "abbr": "BY", "states": [] },
                    { "name": "Belgium", "abbr": "BE", "states": [] },
                    { "name": "Belize", "abbr": "BZ", "states": [] },
                    { "name": "Benin", "abbr": "BJ", "states": [] },
                    { "name": "Bermuda", "abbr": "BM", "states": [] },
                    { "name": "Bhutan", "abbr": "BT", "states": [] },
                    { "name": "Bolivia", "abbr": "BO", "states": [] },
                    { "name": "Bosnia And Herzegovina", "abbr": "BA", "states": [] },
                    { "name": "Botswana", "abbr": "BW", "states": [] },
                    { "name": "Bouvet Island", "abbr": "BV", "states": [] },
                    { "name": "Brazil", "abbr": "BR", "states": [] },
                    { "name": "British Indian Ocean Territory", "abbr": "IO", "states": [] },
                    { "name": "Brunei Darussalam", "abbr": "BN", "states": [] },
                    { "name": "Bulgaria", "abbr": "BG", "states": [] },
                    { "name": "Burkina Faso", "abbr": "BF", "states": [] },
                    { "name": "Burundi", "abbr": "BI", "states": [] },
                    { "name": "Cambodia", "abbr": "KH", "states": [] },
                    { "name": "Cameroon", "abbr": "CM", "states": [] },
                    { "name": "Canada", "abbr": "CA", "states": [   { "name": "Alberta", "abbr": "AB" },
                                                                    { "name": "British Columbia", "abbr": "BC" },
                                                                    { "name": "Manitoba", "abbr": "MB" },
                                                                    { "name": "New Brunswick", "abbr": "NB" },
                                                                    { "name": "Newfoundland and Labrador", "abbr": "NL" },
                                                                    { "name": "Northwest Territories", "abbr": "NT" },
                                                                    { "name": "Nova Scotia", "abbr": "NS" },
                                                                    { "name": "Nunavut", "abbr": "NU" },
                                                                    { "name": "Ontario", "abbr": "ON" },
                                                                    { "name": "Prince Edward Island", "abbr": "PE" },
                                                                    { "name": "Quebec", "abbr": "QC" },
                                                                    { "name": "Saskatchewan", "abbr": "SK" },
                                                                    { "name": "Yukon", "abbr": "YT" }]
                    },
                    { "name": "Cape Verde", "abbr": "CV", "states": [] },
                    { "name": "Cayman Islands", "abbr": "KY", "states": [] },
                    { "name": "Central African Republic", "abbr": "CF", "states": [] },
                    { "name": "Chad", "abbr": "TD", "states": [] },
                    { "name": "Chile", "abbr": "CL", "states": [] },
                    { "name": "China", "abbr": "CN", "states": [] },
                    { "name": "Christmas Island", "abbr": "CX", "states": [] },
                    { "name": "Cocos (Keeling) Islands", "abbr": "CC", "states": [] },
                    { "name": "Colombia", "abbr": "CO", "states": [] },
                    { "name": "Comoros", "abbr": "KM", "states": [] },
                    { "name": "Congo", "abbr": "CG", "states": [] },
                    { "name": "Congo, The Democratic Republic Of The", "abbr": "CD", "states": [] },
                    { "name": "Cook Islands", "abbr": "CK", "states": [] },
                    { "name": "Costa Rica", "abbr": "CR", "states": [] },
                    { "name": "Cote D'Ivoire", "abbr": "CI", "states": [] },
                    { "name": "Croatia", "abbr": "HR", "states": [] },
                    { "name": "Cuba", "abbr": "CU", "states": [] },
                    { "name": "Cyprus", "abbr": "CY", "states": [] },
                    { "name": "Czech Republic", "abbr": "CZ", "states": [] },
                    { "name": "Denmark", "abbr": "DK", "states": [] },
                    { "name": "Djibouti", "abbr": "DJ", "states": [] },
                    { "name": "Dominica", "abbr": "DM", "states": [] },
                    { "name": "Dominican Republic", "abbr": "DO", "states": [] },
                    { "name": "Ecuador", "abbr": "EC", "states": [] },
                    { "name": "Egypt", "abbr": "EG", "states": [] },
                    { "name": "El Salvador", "abbr": "SV", "states": [] },
                    { "name": "Equatorial Guinea", "abbr": "GQ", "states": [] },
                    { "name": "Eritrea", "abbr": "ER", "states": [] },
                    { "name": "Estonia", "abbr": "EE", "states": [] },
                    { "name": "Ethiopia", "abbr": "ET", "states": [] },
                    { "name": "Falkland Islands (Malvinas)", "abbr": "FK", "states": [] },
                    { "name": "Faroe Islands", "abbr": "FO", "states": [] },
                    { "name": "Fiji", "abbr": "FJ", "states": [] },
                    { "name": "Finland", "abbr": "FI", "states": [] },
                    { "name": "France", "abbr": "FR", "states": [] },
                    { "name": "French Guiana", "abbr": "GF", "states": [] },
                    { "name": "French Polynesia", "abbr": "PF", "states": [] },
                    { "name": "French Southern Territories", "abbr": "TF", "states": [] },
                    { "name": "Gabon", "abbr": "GA", "states": [] },
                    { "name": "Gambia", "abbr": "GM", "states": [] },
                    { "name": "Georgia", "abbr": "GE", "states": [] },
                    { "name": "Germany", "abbr": "DE", "states": [] },
                    { "name": "Ghana", "abbr": "GH", "states": [] },
                    { "name": "Gibraltar", "abbr": "GI", "states": [] },
                    { "name": "Greece", "abbr": "GR", "states": [] },
                    { "name": "Greenland", "abbr": "GL", "states": [] },
                    { "name": "Grenada", "abbr": "GD", "states": [] },
                    { "name": "Guadeloupe", "abbr": "GP", "states": [] },
                    { "name": "Guam", "abbr": "GU", "states": [] },
                    { "name": "Guatemala", "abbr": "GT", "states": [] },
                    { "name": "Guernsey", "abbr": " GG", "states": [] },
                    { "name": "Guinea", "abbr": "GN", "states": [] },
                    { "name": "Guinea-Bissau", "abbr": "GW", "states": [] },
                    { "name": "Guyana", "abbr": "GY", "states": [] },
                    { "name": "Haiti", "abbr": "HT", "states": [] },
                    { "name": "Heard Island And Mcdonald Islands", "abbr": "HM", "states": [] },
                    { "name": "Holy See (Vatican City State)", "abbr": "VA", "states": [] },
                    { "name": "Honduras", "abbr": "HN", "states": [] },
                    { "name": "Hong Kong", "abbr": "HK", "states": [] },
                    { "name": "Hungary", "abbr": "HU", "states": [] },
                    { "name": "Iceland", "abbr": "IS", "states": [] },
                    { "name": "India", "abbr": "IN", "states": [] },
                    { "name": "Indonesia", "abbr": "ID", "states": [] },
                    { "name": "Iran, Islamic Republic Of", "abbr": "IR", "states": [] },
                    { "name": "Iraq", "abbr": "IQ", "states": [] },
                    { "name": "Ireland", "abbr": "IE", "states": [] },
                    { "name": "Isle Of Man", "abbr": "IM", "states": [] },
                    { "name": "Israel", "abbr": "IL", "states": [] },
                    { "name": "Italy", "abbr": "IT", "states": [] },
                    { "name": "Jamaica", "abbr": "JM", "states": [] },
                    { "name": "Japan", "abbr": "JP", "states": [] },
                    { "name": "Jersey", "abbr": "JE", "states": [] },
                    { "name": "Jordan", "abbr": "JO", "states": [] },
                    { "name": "Kazakhstan", "abbr": "KZ", "states": [] },
                    { "name": "Kenya", "abbr": "KE", "states": [] },
                    { "name": "Kiribati", "abbr": "KI", "states": [] },
                    { "name": "Korea, Democratic People'S Republic Of", "abbr": "KP", "states": [] },
                    { "name": "Korea, Republic Of", "abbr": "KR", "states": [] },
                    { "name": "Kuwait", "abbr": "KW", "states": [] },
                    { "name": "Kyrgyzstan", "abbr": "KG", "states": [] },
                    { "name": "Lao People'S Democratic Republic", "abbr": "LA", "states": [] },
                    { "name": "Latvia", "abbr": "LV", "states": [] },
                    { "name": "Lebanon", "abbr": "LB", "states": [] },
                    { "name": "Lesotho", "abbr": "LS", "states": [] },
                    { "name": "Liberia", "abbr": "LR", "states": [] },
                    { "name": "Libyan Arab Jamahiriya", "abbr": "LY", "states": [] },
                    { "name": "Liechtenstein", "abbr": "LI", "states": [] },
                    { "name": "Lithuania", "abbr": "LT", "states": [] },
                    { "name": "Luxembourg", "abbr": "LU", "states": [] },
                    { "name": "Macao", "abbr": "MO", "states": [] },
                    { "name": "Macedonia, The Former Yugoslav Republic Of", "abbr": "MK", "states": [] },
                    { "name": "Madagascar", "abbr": "MG", "states": [] },
                    { "name": "Malawi", "abbr": "MW", "states": [] },
                    { "name": "Malaysia", "abbr": "MY", "states": [] },
                    { "name": "Maldives", "abbr": "MV", "states": [] },
                    { "name": "Mali", "abbr": "ML", "states": [] },
                    { "name": "Malta", "abbr": "MT", "states": [] },
                    { "name": "Marshall Islands", "abbr": "MH", "states": [] },
                    { "name": "Martinique", "abbr": "MQ", "states": [] },
                    { "name": "Mauritania", "abbr": "MR", "states": [] },
                    { "name": "Mauritius", "abbr": "MU", "states": [] },
                    { "name": "Mayotte", "abbr": "YT", "states": [] },
                    { "name": "Mexico", "abbr": "MX", "states": [] },
                    { "name": "Micronesia, Federated States Of", "abbr": "FM", "states": [] },
                    { "name": "Moldova, Republic Of", "abbr": "MD", "states": [] },
                    { "name": "Monaco", "abbr": "MC", "states": [] },
                    { "name": "Mongolia", "abbr": "MN", "states": [] },
                    { "name": "Montserrat", "abbr": "MS", "states": [] },
                    { "name": "Morocco", "abbr": "MA", "states": [] },
                    { "name": "Mozambique", "abbr": "MZ", "states": [] },
                    { "name": "Myanmar", "abbr": "MM", "states": [] },
                    { "name": "Namibia", "abbr": "NA", "states": [] },
                    { "name": "Nauru", "abbr": "NR", "states": [] },
                    { "name": "Nepal", "abbr": "NP", "states": [] },
                    { "name": "Netherlands", "abbr": "NL", "states": [] },
                    { "name": "Netherlands Antilles", "abbr": "AN", "states": [] },
                    { "name": "New Caledonia", "abbr": "NC", "states": [] },
                    { "name": "New Zealand", "abbr": "NZ", "states": [] },
                    { "name": "Nicaragua", "abbr": "NI", "states": [] },
                    { "name": "Niger", "abbr": "NE", "states": [] },
                    { "name": "Nigeria", "abbr": "NG", "states": [] },
                    { "name": "Niue", "abbr": "NU", "states": [] },
                    { "name": "Norfolk Island", "abbr": "NF", "states": [] },
                    { "name": "Northern Mariana Islands", "abbr": "MP", "states": [] },
                    { "name": "Norway", "abbr": "NO", "states": [] },
                    { "name": "Oman", "abbr": "OM", "states": [] },
                    { "name": "Pakistan", "abbr": "PK", "states": [] },
                    { "name": "Palau", "abbr": "PW", "states": [] },
                    { "name": "Palestinian Territory, Occupied", "abbr": "PS", "states": [] },
                    { "name": "Panama", "abbr": "PA", "states": [] },
                    { "name": "Papua New Guinea", "abbr": "PG", "states": [] },
                    { "name": "Paraguay", "abbr": "PY", "states": [] },
                    { "name": "Peru", "abbr": "PE", "states": [] },
                    { "name": "Philippines", "abbr": "PH", "states": [] },
                    { "name": "Pitcairn", "abbr": "PN", "states": [] },
                    { "name": "Poland", "abbr": "PL", "states": [] },
                    { "name": "Portugal", "abbr": "PT", "states": [] },
                    { "name": "Puerto Rico", "abbr": "PR", "states": [] },
                    { "name": "Qatar", "abbr": "QA", "states": [] },
                    { "name": "Reunion", "abbr": "RE", "states": [] },
                    { "name": "Romania", "abbr": "RO", "states": [] },
                    { "name": "Russian Federation", "abbr": "RU", "states": [] },
                    { "name": "Rwanda", "abbr": "RW", "states": [] },
                    { "name": "Saint Helena", "abbr": "SH", "states": [] },
                    { "name": "Saint Kitts And Nevis", "abbr": "KN", "states": [] },
                    { "name": "Saint Lucia", "abbr": "LC", "states": [] },
                    { "name": "Saint Pierre And Miquelon", "abbr": "PM", "states": [] },
                    { "name": "Saint Vincent And The Grenadines", "abbr": "VC", "states": [] },
                    { "name": "Samoa", "abbr": "WS", "states": [] },
                    { "name": "San Marino", "abbr": "SM", "states": [] },
                    { "name": "Sao Tome And Principe", "abbr": "ST", "states": [] },
                    { "name": "Saudi Arabia", "abbr": "SA", "states": [] },
                    { "name": "Senegal", "abbr": "SN", "states": [] },
                    { "name": "Serbia And Montenegro", "abbr": "CS", "states": [] },
                    { "name": "Seychelles", "abbr": "SC", "states": [] },
                    { "name": "Sierra Leone", "abbr": "SL", "states": [] },
                    { "name": "Singapore", "abbr": "SG", "states": [] },
                    { "name": "Slovakia", "abbr": "SK", "states": [] },
                    { "name": "Slovenia", "abbr": "SI", "states": [] },
                    { "name": "Solomon Islands", "abbr": "SB", "states": [] },
                    { "name": "Somalia", "abbr": "SO", "states": [] },
                    { "name": "South Africa", "abbr": "ZA", "states": [] },
                    { "name": "South Georgia And The South Sandwich Islands", "abbr": "GS", "states": [] },
                    { "name": "Spain", "abbr": "ES", "states": [] },
                    { "name": "Sri Lanka", "abbr": "LK", "states": [] },
                    { "name": "Sudan", "abbr": "SD", "states": [] },
                    { "name": "Suriname", "abbr": "SR", "states": [] },
                    { "name": "Svalbard And Jan Mayen", "abbr": "SJ", "states": [] },
                    { "name": "Swaziland", "abbr": "SZ", "states": [] },
                    { "name": "Sweden", "abbr": "SE", "states": [] },
                    { "name": "Switzerland", "abbr": "CH", "states": [] },
                    { "name": "Syrian Arab Republic", "abbr": "SY", "states": [] },
                    { "name": "Taiwan, Province Of China", "abbr": "TW", "states": [] },
                    { "name": "Tajikistan", "abbr": "TJ", "states": [] },
                    { "name": "Tanzania, United Republic Of", "abbr": "TZ", "states": [] },
                    { "name": "Thailand", "abbr": "TH", "states": [] },
                    { "name": "Timor-Leste", "abbr": "TL", "states": [] },
                    { "name": "Togo", "abbr": "TG", "states": [] },
                    { "name": "Tokelau", "abbr": "TK", "states": [] },
                    { "name": "Tonga", "abbr": "TO", "states": [] },
                    { "name": "Trinidad And Tobago", "abbr": "TT", "states": [] },
                    { "name": "Tunisia", "abbr": "TN", "states": [] },
                    { "name": "Turkey", "abbr": "TR", "states": [] },
                    { "name": "Turkmenistan", "abbr": "TM", "states": [] },
                    { "name": "Turks And Caicos Islands", "abbr": "TC", "states": [] },
                    { "name": "Tuvalu", "abbr": "TV", "states": [] },
                    { "name": "Uganda", "abbr": "UG", "states": [] },
                    { "name": "Ukraine", "abbr": "UA", "states": [] },
                    { "name": "United Arab Emirates", "abbr": "AE", "states": [] },
                    { "name": "United Kingdom", "abbr": "GB", "states": [] },
                    { "name": "United States Minor Outlying Islands", "abbr": "UM", "states": [] },
                    { "name": "Uruguay", "abbr": "UY", "states": [] },
                    { "name": "Uzbekistan", "abbr": "UZ", "states": [] },
                    { "name": "Vanuatu", "abbr": "VU", "states": [] },
                    { "name": "Venezuela", "abbr": "VE", "states": [] },
                    { "name": "Viet Nam", "abbr": "VN", "states": [] },
                    { "name": "Virgin Islands, British", "abbr": "VG", "states": [] },
                    { "name": "Virgin Islands, U.S.", "abbr": "VI", "states": [] },
                    { "name": "Wallis And Futuna", "abbr": "WF", "states": [] },
                    { "name": "Western Sahara", "abbr": "EH", "states": [] },
                    { "name": "Yemen", "abbr": "YE", "states": [] },
                    { "name": "Zambia", "abbr": "ZM", "states": [] },
                    { "name": "Zimbabwe", "abbr": "ZW", "states": [] }
];
