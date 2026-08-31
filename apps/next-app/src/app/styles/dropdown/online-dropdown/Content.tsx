"use client";

import { useState } from "react";
import { elysiaBaseUrl } from "@/lib/api-base-url";
import { get } from "@/lib/fetcher";
import { Dropdown } from "./dropdown/Dropdown";

type OptionType = {
  id: string;
  name: string;
};

export const Content = () => {
  const [selected, setSelected] = useState<OptionType | OptionType[] | null>(
    null,
  );

  const [selectedMulti, setSelectedMulti] = useState<
    OptionType | OptionType[] | null
  >([]);

  /* function to handle deselection of an option */
  const handleDeselect = (option: OptionType) => {
    if (Array.isArray(selectedMulti)) {
      setSelectedMulti(selectedMulti.filter((item) => item.id !== option.id));
    }
  };

  async function fetchOptions(searchTerm: string) {
    return get<OptionType[]>(`/mock-data/online-dropdown/${searchTerm}`, {
      baseURL: elysiaBaseUrl(),
      headers: {
        "Content-Type": "application/json",
        // Authorization: jwt
      },
    });
  }

  return (
    <div className="flex gap-x-5 bg-neutral-700">
      <div className="min-w-[400px] p-4">
        <Dropdown<OptionType>
          placeholder="Search for an option..."
          selected={selected}
          setSelected={setSelected}
          fetchOptions={fetchOptions}
          labelKey="name"
        />
      </div>
      <div className="min-w-[400px] p-4">
        <Dropdown<OptionType>
          placeholder="Search for options..."
          selected={selectedMulti}
          setSelected={setSelectedMulti}
          fetchOptions={fetchOptions}
          labelKey="name"
          renderOption={(option) => {
            return (
              <div className="flex items-center gap-x-2">
                <div>{option.id}</div>
                <span>{option.name}</span>
              </div>
            );
          }}
          multiple={true}
        />
      </div>
      <div className="flex w-full flex-wrap gap-1.5 p-4">
        {selectedMulti &&
          (selectedMulti as OptionType[]).map((selected, i) => {
            return (
              <button
                key={selected.id}
                onClick={() => handleDeselect(selected)}
                className="h-7 cursor-pointer truncate rounded-md bg-neutral-600 px-2 py-1 text-sm text-white hover:bg-neutral-500 hover:line-through"
              >
                {selected.name}
              </button>
            );
          })}
      </div>
    </div>
  );
};
