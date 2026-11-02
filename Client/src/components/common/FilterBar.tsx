import React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { FILTER_ITEMS_TYPE, SORT_TYPE } from "../../utils/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterBarProps {
    setType(type: FILTER_ITEMS_TYPE): void;
    setSortBy(type: SORT_TYPE): void;
    sortBy: SORT_TYPE;
    filterType: FILTER_ITEMS_TYPE;
}

const FilterBar: React.FC<FilterBarProps> = ({ setType, setSortBy, sortBy, filterType }) => {
    const handleReverseClick = () => {
        if (sortBy === SORT_TYPE.BY_NAME_DESC) setSortBy(SORT_TYPE.BY_NAME_ASC);
        if (sortBy === SORT_TYPE.BY_NAME_ASC) setSortBy(SORT_TYPE.BY_NAME_DESC);

        if (sortBy === SORT_TYPE.BY_DATE_DESC) setSortBy(SORT_TYPE.BY_DATE_ASC);
        if (sortBy === SORT_TYPE.BY_DATE_ASC) setSortBy(SORT_TYPE.BY_DATE_DESC);
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Select value={filterType} onValueChange={(value) => setType(value as FILTER_ITEMS_TYPE)}>
                <SelectTrigger aria-label="Filter items by type" className="w-auto min-w-36 gap-2 rounded-lg">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {Object.values(FILTER_ITEMS_TYPE).map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SORT_TYPE)}>
                    <SelectTrigger aria-label="Sort by" className="w-auto min-w-44 gap-2 rounded-lg">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.values(SORT_TYPE).map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={sortBy.includes('descending') ? "Sort ascending" : "Sort descending"}
                    onClick={handleReverseClick}
                >
                    {sortBy.includes('descending') ? <ArrowDown /> : <ArrowUp />}
                </Button>
            </div>
        </div>
    );
};
export default FilterBar;
