import { Button, Popover, Typography, List, ListItem, ListItemButton, IconButton } from "@mui/material";
import React, { useState } from "react";
import { FILTER_ITEMS_TYPE, SORT_TYPE } from "../../utils/constants";
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';

interface FilterBarProps {
    setType(type: FILTER_ITEMS_TYPE): void;
    setSortBy(type: SORT_TYPE): void;
    sortBy: SORT_TYPE;
    filterType: FILTER_ITEMS_TYPE;
}

const FilterBar: React.FC<FilterBarProps> = ({ setType, setSortBy, sortBy, filterType }) => {
    const [typeAnchorEl, setTypeAnchorEl] = useState<null | HTMLElement>(null);
    const [sortByAnchorEl, setSortByAnchorEl] = useState<null | HTMLElement>(null);

    const handleTypeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setTypeAnchorEl(event.currentTarget);
    };

    const handleSortByClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setSortByAnchorEl(event.currentTarget);
    };

    const handleTypeClose = (type: FILTER_ITEMS_TYPE) => {
        setType(type);
        setTypeAnchorEl(null);
    };

    const handleSortByClose = (type: SORT_TYPE) => {
        setSortBy(type);
        setSortByAnchorEl(null);
    };

    const handleReverseClick = () => {
        if(sortBy === SORT_TYPE.BY_NAME_DESC) setSortBy(SORT_TYPE.BY_NAME_ASC);
        if(sortBy === SORT_TYPE.BY_NAME_ASC) setSortBy(SORT_TYPE.BY_NAME_DESC);

        if(sortBy === SORT_TYPE.BY_DATE_DESC) setSortBy(SORT_TYPE.BY_DATE_ASC);
        if(sortBy === SORT_TYPE.BY_DATE_ASC) setSortBy(SORT_TYPE.BY_DATE_DESC);
    }

    return (
        <>
            <Button onClick={handleTypeClick}>Filter Type: {filterType}</Button>
            <Popover
                anchorEl={typeAnchorEl}
                open={Boolean(typeAnchorEl)}
                onClose={() => setTypeAnchorEl(null)}
            >
                <List>
                    {Object.values(FILTER_ITEMS_TYPE).map((type) => (
                        <ListItem key={type} disablePadding>
                            <ListItemButton onClick={() => handleTypeClose(type)}>
                                <Typography variant="body1">{type}</Typography>
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Popover>

            <Button onClick={handleSortByClick}>
                Sort by: {sortBy}
            </Button>
            <IconButton edge="end" aria-label="Edit"  onClick={handleReverseClick}>
                {sortBy.includes('descending') ?  <ArrowDropDownIcon />  : <ArrowDropUpIcon />}
            </IconButton>
                
            <Popover
                anchorEl={sortByAnchorEl}
                open={Boolean(sortByAnchorEl)}
                onClose={() => setSortByAnchorEl(null)}
            >
                <List>
                    <ListItem key={SORT_TYPE.BY_NAME_DESC} disablePadding>
                        <ListItemButton onClick={() => handleSortByClose(SORT_TYPE.BY_NAME_DESC)}>
                            <Typography variant="body1">By name</Typography>
                        </ListItemButton>
                    </ListItem>
                    <ListItem key={SORT_TYPE.BY_DATE_DESC} disablePadding>
                        <ListItemButton onClick={() => handleSortByClose(SORT_TYPE.BY_DATE_DESC)}>
                            <Typography variant="body1">By Date</Typography>
                        </ListItemButton>
                    </ListItem>
                </List>
            </Popover>
        </>
    );
};
export default FilterBar;