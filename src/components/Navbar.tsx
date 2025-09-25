"use client";

import Image from "next/image";

import React from "react";

const Navbar = () => {

    return (
        <div className="flex items-center justify-between p-4 lg:p-6 bg-Skylight shadow-sm border-b border-gray-200">
            <div className="flex items-center gap-8 justify-end w-full">
                <Image
                    src="/logo.png"
                    alt="logo"
                    width={50}
                    height={50}
                    className="transition-transform duration-200 hover:scale-105"
                />
            </div>
        </div>
    );
};

export default Navbar;
